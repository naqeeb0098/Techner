import frappe
from frappe.utils import get_datetime, add_to_date, now_datetime
from frappe import _

def update_is_responded(doc, method=None):
    """
    Updates custom_is_responded based on last_customer_response and last_agent_response.
    Enabled (1) if last_customer_response > last_agent_response.
    Disabled (0) otherwise.
    """
    last_customer = get_datetime(doc.last_customer_response) if doc.last_customer_response else None
    last_agent = get_datetime(doc.last_agent_response) if doc.last_agent_response else None

    if last_customer:
        if not last_agent or last_customer > last_agent:
            doc.custom_is_responded = 1
        else:
            doc.custom_is_responded = 0
    else:
        doc.custom_is_responded = 0

    # Reset warning mail sent if last_agent_response changed (new response from agent)
    if not doc.is_new() and doc.has_value_changed('last_agent_response'):
        doc.custom_warning_mail_sent = 0

def send_auto_resolution_warning():
    """
    Background job to send warning emails for tickets with no customer response
    for the configured number of hours (from HD Ticket Settings), then auto-close.
    """
    # Check if email sending is enabled in HD Ticket Settings
    settings = frappe.get_single("HD Ticket Settings")
    if not settings.send_email:
        return

    # Use dynamic hours from settings (fallback to 48 if not set)
    hours = -(settings.hours or 48)
    threshold_time = add_to_date(now_datetime(), hours=hours)

    # Get tickets where:
    # 1. Last agent response was more than `hours` hours ago
    # 2. Status is not Closed or Resolved
    # 3. Warning mail hasn't been sent yet for this response cycle
    tickets = frappe.get_all("HD Ticket", filters={
        "last_agent_response": ["<", threshold_time],
        "custom_warning_mail_sent": 0,
        "status": ["not in", ["Closed", "Resolved"]]
    }, fields=["name", "last_customer_response", "last_agent_response", "raised_by", "subject", "email_account"])

    for t in tickets:
        last_cust = get_datetime(t.last_customer_response) if t.last_customer_response else None
        last_agent = get_datetime(t.last_agent_response)

        # If agent response is more recent than customer response (or no customer response)
        if not last_cust or last_agent > last_cust:
            try:
                send_warning_email(t, settings)

                # Update ticket: Set warning flag and close the ticket
                doc = frappe.get_doc("HD Ticket", t.name)
                doc.custom_warning_mail_sent = 1
                doc.status = "Closed"
                doc.save(ignore_permissions=True)

                frappe.db.commit()
            except Exception as e:
                frappe.log_error(
                    f"Error sending auto-resolution warning and closing {t.name}: {str(e)}",
                    "Auto Resolution Warning"
                )

def send_warning_email(ticket_data, settings):
    """
    Sends the warning email using the Notification template mapped to the
    ticket's email account in the HD Ticket Settings Child table.
    """
    ticket_email_account = ticket_data.get("email_account")

    # Look up the matching notification template from the child table
    notification_template = None
    for row in settings.get("hd_ticket_settings_child", []):
        if row.email_account == ticket_email_account:
            notification_template = row.notification_template
            break

    if not notification_template:
        frappe.log_error(
            f"No notification template found for email account '{ticket_email_account}' "
            f"in HD Ticket Settings. Skipping ticket {ticket_data.get('name')}.",
            "Auto Resolution Warning"
        )
        return

    notification = frappe.get_doc("Notification", notification_template)
    doc = frappe.get_doc("HD Ticket", ticket_data["name"])

    # Render subject and message using the Notification template and current doc as context
    subject = frappe.render_template(notification.subject, {"doc": doc})
    message = frappe.render_template(notification.message, {"doc": doc})

    # Get sender from notification template or fall back to session user
    sender = notification.sender_email or notification.sender or frappe.session.user

    recipient = doc.raised_by
    if recipient == "Administrator":
        recipient = frappe.db.get_value("User", "Administrator", "email") or "admin@example.com"

    if not recipient:
        return  # Skip if no email

    frappe.sendmail(
        recipients=[recipient],
        sender=sender,
        subject=subject,
        message=message,
        reference_doctype="HD Ticket",
        reference_name=doc.name
    )
