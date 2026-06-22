import frappe
from frappe import _
import json

@frappe.whitelist()
def get_tracker_data(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    query_filters = {}
    
    if filters:
        # if filters.get("job_applicant"):
        #     query_filters["job_applicant"] = filters.get("job_applicant")
        # if filters.get("job_opening"):
        #     query_filters["job_opening"] = filters.get("job_opening")
        if filters.get("applicant_name"):
            query_filters["applicant_name"] = ["like", f"%{filters.get('applicant_name')}%"]
        if filters.get("job_applicant_source"):
            query_filters["job_applicant_source"] = filters.get("job_applicant_source")
        if filters.get("role"):
            query_filters["role"] = ["like", f"%{filters.get('role')}%"]
        if filters.get("recommendation"):
            query_filters["recommendation"] = filters.get("recommendation")
        if filters.get("final_conclusion"):
            query_filters["final_conclusion"] = ["like", f"%{filters.get('final_conclusion')}%"]
        if filters.get("location"):
            query_filters["location"] = ["like", f"%{filters.get('location')}%"]        
        if filters.get("experience"):
            query_filters["experience"] = ["like", f"%{filters.get('experience')}%"]   
        if filters.get("conclusionfeedback"):
            query_filters["conclusionfeedback"] = ["like", f"%{filters.get('conclusionfeedback')}%"]  
                       
    meta = frappe.get_meta("Applicant Tracker")
    fields = [f.fieldname for f in meta.fields if f.fieldtype not in ["Section Break", "Column Break"] and f.fieldname not in ["job_applicant", "job_opening"]]
    
    # Always include name and basic info
    data = frappe.get_all("Applicant Tracker", 
                          filters=query_filters, 
                          fields=["name"] + fields,
                          order_by="creation desc")

    # Get field metadata for the frontend to handle Link fields and Read-only
    field_meta = {}
    for f in meta.fields:
        if f.fieldtype not in ["Section Break", "Column Break"]:
            field_meta[f.fieldname] = {
                "label": f.label,
                "fieldtype": f.fieldtype,
                "options": f.options,
                "read_only": f.read_only,
                "reqd": f.reqd
            }

    return {
        "data": data,
        "field_meta": field_meta,
        "fields_order": fields
    }

@frappe.whitelist()
def update_tracker_field(docname, field, value):
    if not frappe.has_permission("Applicant Tracker", "write"):
        frappe.throw(_("Not permitted to update Applicant Tracker"))
        
    frappe.db.set_value("Applicant Tracker", docname, field, value)
    return "success"
