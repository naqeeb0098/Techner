import frappe
from frappe import _
import json


@frappe.whitelist()
def get_page_data(
    filters=None,
    email_from_date=None,
    email_to_date=None,
    msg_from_date=None,
    msg_to_date=None,
):
    if isinstance(filters, str):
        filters = json.loads(filters)

    if not isinstance(filters, list):
        filters = []

    fields = [
        "name",
        "contact_person_name",
        "designation",
        "contact_person_email",
        "contact_person_number",
        "crm_leads",
        "website",
        "sales_manager",
        "sale_manager_name",
        "first_email",
        "second_email",
        "third_email",
        "remarks",
        "notes",
        "connection_request",
        "linkedin_link",
        "first_message",
        "second_message",
    ]

    raw_data = frappe.get_all(
        "Lead Contact Person",
        filters=filters,
        fields=fields,
        order_by="modified desc",
    )

    data = []
    has_email_filter = bool(email_from_date or email_to_date)
    has_msg_filter = bool(msg_from_date or msg_to_date)

    def is_date_in_range(val, from_date, to_date):
        if not val:
            return False
        val_str = str(val)
        if from_date and val_str < str(from_date):
            return False
        if to_date and val_str > str(to_date):
            return False
        return True

    for row in raw_data:
        if has_email_filter:
            email_dates = [
                row.get("first_email"),
                row.get("second_email"),
                row.get("third_email"),
            ]
            if not any(
                is_date_in_range(d, email_from_date, email_to_date)
                for d in email_dates
            ):
                continue

        if has_msg_filter:
            msg_dates = [row.get("first_message"), row.get("second_message")]
            if not any(
                is_date_in_range(d, msg_from_date, msg_to_date)
                for d in msg_dates
            ):
                continue

        data.append(row)

    # ── Stats ────────────────────────────────────────────────────────────────
    # Calculate stats directly from the filtered data to respect all active filters
    total = len(data)

    connected = 0
    requested = 0
    not_connected = 0
    contacted = 0
    message_sent = 0
    companies_set = set()

    for row in data:
        # Connection status counts
        if row.get("connection_request") == "Connected":
            connected += 1
        elif row.get("connection_request") == "Requested":
            requested += 1
        elif row.get("connection_request") == "Not Connected":
            not_connected += 1

        # Total emails sent across 1st, 2nd, 3rd email fields for this row
        if row.get("first_email"):
            contacted += 1
        if row.get("second_email"):
            contacted += 1
        if row.get("third_email"):
            contacted += 1
        if row.get("first_message"):
            message_sent += 1
        if row.get("second_message"):
            message_sent += 1

        # Unique companies
        if row.get("crm_leads"):
            companies_set.add(row.get("crm_leads"))

    companies = len(companies_set)

    stats = {
        "total": total,
        "connected": connected,
        "requested": requested,
        "not_connected": not_connected,
        "contacted": contacted,
        "message_sent": message_sent,
        "companies": companies,
    }

    return {"data": data, "stats": stats}





@frappe.whitelist()
def update_field(docname, field, value):
    allowed_fields = {
        "remarks", "notes", "connection_request",
        "first_email", "second_email", "third_email",
        "first_message", "second_message",
        "linkedin_link", "designation",
        "contact_person_email",
        "contact_person_number", "crm_leads", "sales_manager",
    }

    if field not in allowed_fields:
        frappe.throw(_("Field '{0}' is not editable via this page.").format(field))

    if not frappe.has_permission("Lead Contact Person", "write", docname):
        frappe.throw(_("Not permitted to update Lead Contact Person"))

    frappe.db.set_value("Lead Contact Person", docname, field, value or None)
    frappe.db.commit()
    return "ok"
