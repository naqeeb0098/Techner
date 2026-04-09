# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
import zipfile
import os
from frappe.utils.file_manager import get_file
from frappe.model.document import Document


class ApplicationForm(Document):
	pass


@frappe.whitelist()
def download_all_attachments(docname):
    doc = frappe.get_doc("Application Form", docname)

    attachment_fields = [
        'passport_attachment',
        'national_seamans_book__cdc_attachment',
        'seaman_identity_document_sid_attachment',
        'certificate_of_competency_coc_attachment',
        'stcw_endorsement_if_coc_held_attachment',
        'any_valid_visa_attachment',
        'basic_safety_training_bst_attachment',
        'personal_survival_techniques_pst_attachment',
        'fire_prevention_and_fire_fighting_fpff_attachment',
        'personal_safety_and_social_responsibilities_pssr_attachment',
        'watchkeeping_certificate_rfpnw__rfpew_attachment',
        'advanced_fire_fighting_aff_attachment',
        'proficiency_in_survival_craft_and_rescue_boats_pscrb_attachment',
        'tanker_familiarization__tanker_certification_attachment',
        'dangerous_cargo_endorsement_attachment',
        'dangerous_cargo_attachment_2',
        'ecdis__gmdss_attachment',
        'gdmss_attachment',
        'resume_attachment'
    ]

    files = []

    # collect valid files first
    for field in attachment_fields:
        file_url = doc.get(field)
        if file_url:
            try:
                file_doc = frappe.get_doc("File", {"file_url": file_url})
                file_path = file_doc.get_full_path()

                if os.path.exists(file_path):
                    files.append(file_path)
            except Exception:
                pass

    # no files case
    if not files:
        return {
            "status": "no_files",
            "message": "No attachments found"
        }

    # create zip only if files exist
    zip_path = f"/tmp/{docname}_attachments.zip"

    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file_path in files:
            zipf.write(file_path, os.path.basename(file_path))

    return {
        "file_url": f"/api/method/techner.techner.doctype.application_form.application_form.download_zip?path={zip_path}"
    }
@frappe.whitelist(allow_guest=True)
def download_zip(path):
    import frappe
    from frappe.utils.response import build_response

    with open(path, "rb") as f:
        frappe.response.filename = os.path.basename(path)
        frappe.response.filecontent = f.read()
        frappe.response.type = "download"

    return build_response("download")