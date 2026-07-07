import frappe
from frappe import _
import json


@frappe.whitelist()
def get_page_data(filters=None):
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

    data = frappe.get_all(
        "Lead Contact Person",
        filters=filters,
        fields=fields,
        order_by="modified desc",
    )

    # ── Stats ────────────────────────────────────────────────────────────────
    # Calculate stats directly from the filtered data to respect all active filters
    total = len(data)
    
    connected = 0
    requested = 0
    not_connected = 0
    contacted = 0
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
        if row.get("first_email"): contacted += 1
        if row.get("second_email"): contacted += 1
        if row.get("third_email"): contacted += 1

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
