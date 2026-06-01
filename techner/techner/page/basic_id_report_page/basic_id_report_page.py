import frappe
from frappe import _
import json

@frappe.whitelist()
def get_report_data(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    if not filters:
        filters = {}
        
    records = get_raw_records(filters)
    
    # Group records by email
    records_by_email = {}
    for r in records:
        email_key = r.get("email") or ""
        if email_key not in records_by_email:
            records_by_email[email_key] = []
        records_by_email[email_key].append(r)
        
    compared_fields = [
        "full_name",
        "email",
        "mobile_number",
        "date_of_birth",
        "current_residential_address",
        "postal_code",
        "permanent_home_address",
        "nationality_all",
        "home_telephone_number",
        "cnicid_number",
        "passport_num",
        "test_lable",
        "name1",
        "contact_number",
        "postal_address",
        "relationship",
        "email_address",
        "have_you_ever_been_convicted_of_a_criminal_offense",
        "please_specify_about_criminal_offense",
        "have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
        "please_specify_about_drug_or_substance_misuse",
        "bank_name",
        "name_on_the_account",
        "iban",
        "swift_code",
        "account_currency",
        "branch_address",
        "branch_id",
        "branch_name",
        "date"
    ]
    
    grouped_data = []
    
    # Process each email group to create a grouped segment for each employee
    for email_key, user_records in records_by_email.items():
        # Chronological order (oldest first)
        chrono_records = list(reversed(user_records))
        
        for i, rec in enumerate(chrono_records):
            rec["_changed_fields"] = []
            
            if i == 0:
                rec["_record_type"] = _("Baseline")
            else:
                rec["_record_type"] = f"{_('Update')} {i}"
                # Compare to immediate predecessor
                prev_rec = chrono_records[i - 1]
                for field in compared_fields:
                    val_curr = rec.get(field)
                    val_prev = prev_rec.get(field)
                    if values_differ(val_curr, val_prev):
                        rec["_changed_fields"].append(field)
                        
        grouped_data.append({
            "employee_title": chrono_records[0].get("full_name") or chrono_records[0].get("email") or _("Record"),
            "employee_code": chrono_records[0].get("test_lable") or chrono_records[0].get("name") or "",
            "email": email_key,
            "records": chrono_records
        })
        
    # Sort grouped segments alphabetically by employee name
    grouped_data.sort(key=lambda x: x.get("employee_title").lower())
            
    # Columns define the rows vertically
    columns = [
        {"fieldname": "name", "label": _("ID"), "fieldtype": "Link", "options": "Basic ID Form"},
        {"fieldname": "creation", "label": _("Creation"), "fieldtype": "Datetime"},
        {"fieldname": "test_lable", "label": _("Employee Code"), "fieldtype": "Link", "options": "Employee"},
        {"fieldname": "full_name", "label": _("Full Name"), "fieldtype": "Data"},
        {"fieldname": "email", "label": _("Email"), "fieldtype": "Data"},
        {"fieldname": "mobile_number", "label": _("Mobile Number"), "fieldtype": "Data"},
        {"fieldname": "date_of_birth", "label": _("Date of Birth"), "fieldtype": "Date"},
        {"fieldname": "current_residential_address", "label": _("Current Residential Address"), "fieldtype": "Data"},
        {"fieldname": "postal_code", "label": _("Postal Code"), "fieldtype": "Data"},
        {"fieldname": "permanent_home_address", "label": _("Permanent Home Address"), "fieldtype": "Data"},
        {"fieldname": "nationality_all", "label": _("Nationality"), "fieldtype": "Data"},
        {"fieldname": "home_telephone_number", "label": _("Home Telephone Number"), "fieldtype": "Data"},
        {"fieldname": "cnicid_number", "label": _("CNIC/ID Number"), "fieldtype": "Data"},
        {"fieldname": "passport_num", "label": _("Passport Number"), "fieldtype": "Data"},
        {"fieldname": "name1", "label": _("Kin Name"), "fieldtype": "Data"},
        {"fieldname": "contact_number", "label": _("Kin Contact"), "fieldtype": "Data"},
        {"fieldname": "postal_address", "label": _("Kin Address"), "fieldtype": "Data"},
        {"fieldname": "relationship", "label": _("Kin Relationship"), "fieldtype": "Data"},
        {"fieldname": "email_address", "label": _("Kin Email"), "fieldtype": "Data"},
        {"fieldname": "have_you_ever_been_convicted_of_a_criminal_offense", "label": _("Convicted?"), "fieldtype": "Data"},
        {"fieldname": "please_specify_about_criminal_offense", "label": _("Criminal Details"), "fieldtype": "Data"},
        {"fieldname": "have_you_ever_lost_a_job_due_to_drug_or_substance_misuse", "label": _("Lost Job due to Drug?"), "fieldtype": "Data"},
        {"fieldname": "please_specify_about_drug_or_substance_misuse", "label": _("Drug Details"), "fieldtype": "Data"},
        {"fieldname": "bank_name", "label": _("Bank Name"), "fieldtype": "Data"},
        {"fieldname": "name_on_the_account", "label": _("Name on Account"), "fieldtype": "Data"},
        {"fieldname": "iban", "label": _("IBAN"), "fieldtype": "Data"},
        {"fieldname": "swift_code", "label": _("Swift Code"), "fieldtype": "Data"},
        {"fieldname": "account_currency", "label": _("Currency"), "fieldtype": "Data"},
        {"fieldname": "branch_address", "label": _("Branch Address"), "fieldtype": "Data"},
        {"fieldname": "branch_id", "label": _("Branch ID"), "fieldtype": "Data"},
        {"fieldname": "branch_name", "label": _("Branch Name"), "fieldtype": "Data"},
        {"fieldname": "date", "label": _("Date"), "fieldtype": "Date"}
    ]
    
    return {
        "columns": columns,
        "data": grouped_data
    }


def get_raw_records(filters):
    conditions = {}

    if filters.get("email"):
        conditions["email"] = ["like", f"%{filters.get('email')}%"]

    if filters.get("employee"):
        conditions["test_lable"] = filters.get("employee")

    if filters.get("from_date") and filters.get("to_date"):
        conditions["creation"] = ["between", [filters.get("from_date") + " 00:00:00", filters.get("to_date") + " 23:59:59"]]
    elif filters.get("from_date"):
        conditions["creation"] = [">=", filters.get("from_date") + " 00:00:00"]
    elif filters.get("to_date"):
        conditions["creation"] = ["<=", filters.get("to_date") + " 23:59:59"]

    fields = [
        "name",
        "creation",
        "test_lable",
        "full_name",
        "email",
        "mobile_number",
        "date_of_birth",
        "current_residential_address",
        "postal_code",
        "permanent_home_address",
        "nationality_all",
        "home_telephone_number",
        "cnicid_number",
        "passport_num",
        "name1",
        "contact_number",
        "postal_address",
        "relationship",
        "email_address",
        "have_you_ever_been_convicted_of_a_criminal_offense",
        "please_specify_about_criminal_offense",
        "have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
        "please_specify_about_drug_or_substance_misuse",
        "bank_name",
        "name_on_the_account",
        "iban",
        "swift_code",
        "account_currency",
        "branch_address",
        "branch_id",
        "branch_name",
        "date",
    ]

    records = frappe.get_all(
        "Basic ID Form",
        filters=conditions,
        fields=fields,
        order_by="email ASC, creation DESC",
    )
    return records


def values_differ(val1, val2):
    import datetime

    # Normalize Date/Datetime/None to comparable strings
    if isinstance(val1, (datetime.date, datetime.datetime)):
        val1 = val1.strftime("%Y-%m-%d")
    if isinstance(val2, (datetime.date, datetime.datetime)):
        val2 = val2.strftime("%Y-%m-%d")

    v1 = "" if val1 is None else str(val1).strip()
    v2 = "" if val2 is None else str(val2).strip()

    return v1 != v2
