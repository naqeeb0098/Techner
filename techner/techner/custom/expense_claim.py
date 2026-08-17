import frappe

def make_attachments_public(doc, method=None):
    meta = frappe.get_meta(doc.doctype)

    for df in meta.fields:
        if df.fieldtype != "Table":
            continue

        child_meta = frappe.get_meta(df.options)

        attach_fields = [
            child_df.fieldname
            for child_df in child_meta.fields
            if child_df.fieldtype in ("Attach", "Attach Image")
        ]

        if not attach_fields:
            continue

        for row in doc.get(df.fieldname) or []:
            for fieldname in attach_fields:
                file_url = row.get(fieldname)

                if not file_url:
                    continue

                # Only find PRIVATE file
                file_name = frappe.db.get_value(
                    "File",
                    {
                        "file_url": file_url,
                        "is_private": 1
                    },
                    "name"
                )

                # Only private files will be updated
                if file_name:
                    frappe.db.set_value(
                        "File",
                        file_name,
                        "is_private",
                        0
                    )


# import frappe
# def make_expense_claim_attachments_public(doc, method=None):
#     for row in doc.expenses:
#         if not row.custom_attachment:
#             continue

#         file_url = row.custom_attachment

#         file_name = frappe.db.get_value(
#             "File",
#             {"file_url": file_url},
#             "name"
#         )

#         if file_name:
#             frappe.db.set_value(
#                 "File",
#                 file_name,
#                 "is_private",
#                 0
#             )

