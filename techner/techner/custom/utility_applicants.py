import frappe

def validate(doc, method=None):
    """Server-side: Ensure resume_attachment is a PDF file only."""
    if doc.get("resume"):
        url = doc.resume
        if not url.lower().endswith(".pdf"):
            frappe.throw(
                frappe._("Resume attachment must be a PDF file. Please upload a .pdf file."),
                title=frappe._("Invalid File Type")
            )
