import frappe
from frappe.modules.utils import sync_customizations


def execute():
    # migrate patches ko customizations se pehle chalata hai, isliye column pehle bana lo
    sync_customizations("techner")

    # direct SQL: modified / modified_by nahi badalte aur Version (change log) nahi banta
    frappe.db.sql(
        """
        UPDATE `tabJob Applicant` ja
        INNER JOIN `tabJob Opening` jo ON jo.name = ja.job_title
        SET ja.custom_job_application_route = jo.job_application_route
        WHERE IFNULL(ja.custom_job_application_route, '') != IFNULL(jo.job_application_route, '')
        """
    )
