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
    Background job to send warning emails for tickets with no customer response for 48 hours.
    And automatically close the ticket.
    """
    # 48 hours threshold
    threshold_time = add_to_date(now_datetime(), hours=-48)
    
    # Get tickets where:
    # 1. Last agent response was more than 48 hours ago
    # 2. Status is not Closed or Resolved
    # 3. Warning mail hasn't been sent yet for this response cycle
    tickets = frappe.get_all("HD Ticket", filters={
        "last_agent_response": ["<", threshold_time],
        "custom_warning_mail_sent": 0,
        "status": ["not in", ["Closed", "Resolved"]]
    }, fields=["name", "last_customer_response", "last_agent_response", "raised_by", "subject"])
    
    for t in tickets:
        last_cust = get_datetime(t.last_customer_response) if t.last_customer_response else None
        last_agent = get_datetime(t.last_agent_response)
        
        # If agent response is more recent than customer response (or no customer response)
        if not last_cust or last_agent > last_cust:
            try:
                send_warning_email(t)
                
                # Update ticket: Set warning flag and close the ticket
                # We use frappe.get_doc then save to ensure SLA and other hooks are properly settled
                doc = frappe.get_doc("HD Ticket", t.name)
                doc.custom_warning_mail_sent = 1
                doc.status = "Closed"
                doc.save(ignore_permissions=True)
                
                frappe.db.commit()
            except Exception as e:
                frappe.log_error(f"Error sending auto-resolution warning and closing {t.name}: {str(e)}", "Auto Resolution Warning")

def send_warning_email(ticket_data):
    """
    Sends the HTML warning email using an Email Template record.
    """
    template_name = "HD Ticket Auto-Resolution Warning"
    
    if not frappe.db.exists("Email Template", template_name):
        create_default_email_template(template_name)
    
    template_doc = frappe.get_doc("Email Template", template_name)
    doc = frappe.get_doc("HD Ticket", ticket_data['name'])
    
    subject = frappe.render_template(template_doc.subject, {"doc": doc})
    message = frappe.render_template(template_doc.response, {"doc": doc})
    
    recipient = doc.raised_by
    if recipient == "Administrator":
        recipient = frappe.db.get_value("User", "Administrator", "email") or "admin@example.com"

    if not recipient:
        return # Skip if no email

    frappe.sendmail(
        recipients=[recipient],
        subject=subject,
        message=message,
        reference_doctype="HD Ticket",
        reference_name=doc.name
    )

def create_default_email_template(name):
    """
    Creates a premium HTML email template if it doesn't exist.
    """
    if frappe.db.exists("Email Template", name):
        return

    template = frappe.new_doc("Email Template")
    template.name = name
    template.subject = "Ticket #{{ doc.name }} has been Closed due to inactivity"
    template.response = """
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
    <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Ticket Resolved</h2>
    </div>
    
    <p>Dear Customer,</p>
    
    <p>We are following up on your ticket <strong>#{{ doc.name }}</strong> (<em>{{ doc.subject }}</em>).</p>
    
    <div style="background-color: #f8f9fa; border-left: 5px solid #2c3e50; padding: 15px; margin: 20px 0; color: #555;">
        Since we haven't received a response from you in over 48 hours, we have marked this ticket as <strong>Closed</strong>. 
    </div>
    
    <p>We hope the information provided earlier was helpful. If you still have questions or need further assistance, please feel free to <strong>reply to this email</strong> to reopen the ticket.</p>
    
    <p>Your satisfaction is important to us!</p>
    
    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #999; text-align: center;">
        Thank you for choosing our services.
    </p>
</div>
"""
    template.insert(ignore_permissions=True)
