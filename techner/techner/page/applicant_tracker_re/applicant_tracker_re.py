import frappe

@frappe.whitelist()
def get_applicant_tracker_report(
    applicant_name=None,
    job_applicant=None,
    job_opening=None,
    job_applicant_source=None,
    from_date=None,
    to_date=None
):

    try:

        fields = [
            "name",
            "job_applicant",
            "applicant_name",
            "job_applicant_source",
            "job_opening",
            "job_opening_title",
            "role",
            "initial_screening_date",
            "interviewer_name",
            "nationality",
            "education",
            "experience",
            "foreign_education",
            "foreign_experience",
            "cv_fit_for_role",
            "competence_impression",
            "management_skills",
            "relevant_experience",
            "customer_relationship",
            "english_communication",
            "contract_permanent_and_benefits",
            "notice_period",
            "location",
            "current_salary",
            "expected_salary",
            "conclusionfeedback",
            "recommendation",
            "p2",
            "reasoning",
            "certifications_and_tools",
            "interview_date",
            "final_conclusion",
            "client_interview_history",
            "skillset"
        ]

        filters = {}

        if applicant_name:
            filters["applicant_name"] = ["like", f"%{applicant_name}%"]

        if job_applicant:
            filters["job_applicant"] = job_applicant

        if job_opening:
            filters["job_opening"] = job_opening

        if job_applicant_source:
            filters["job_applicant_source"] = job_applicant_source

        if from_date and to_date:
            filters["interview_date"] = ["between", [from_date, to_date]]

        elif from_date:
            filters["interview_date"] = [">=", from_date]

        elif to_date:
            filters["interview_date"] = ["<=", to_date]

        data = frappe.get_all(
            "Applicant Tracker",
            fields=fields,
            filters=filters if filters else None,
            order_by="modified desc",
            limit_page_length=1000
        )

        return {"status": "success", "data": data}

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Applicant Tracker API Error")
        return {"status": "error", "message": str(e)}




# ============================================================attempt 2=========================================

# import frappe

# @frappe.whitelist()
# def get_applicant_tracker_report(
#     applicant_name=None,
#     job_applicant=None,
#     job_opening=None,
#     job_applicant_source=None,
#     from_date=None,
#     to_date=None
# ):

#     try:

#         fields = [
#             "name",
#             "job_applicant",
#             "applicant_name",
#             "job_applicant_source",
#             "job_opening",
#             "job_opening_title",
#             "role",
#             "initial_screening_date",
#             "interviewer_name",
#             "nationality",
#             "education",
#             "experience",
#             "foreign_education",
#             "foreign_experience",
#             "cv_fit_for_role",
#             "competence_impression",
#             "management_skills",
#             "relevant_experience",
#             "customer_relationship",
#             "english_communication",
#             "contract_permanent_and_benefits",
#             "notice_period",
#             "location",
#             "current_salary",
#             "expected_salary",
#             "conclusionfeedback",
#             "recommendation",
#             "p2",
#             "reasoning",
#             "certifications_and_tools",
#             "interview_date",
#             "final_conclusion",
#             "client_interview_history",
#             "skillset"
#         ]

#         filters = {}

#         # ================= TEXT FILTERS =================
#         if applicant_name:
#             filters["applicant_name"] = ["like", f"%{applicant_name}%"]

#         if job_applicant:
#             filters["job_applicant"] = job_applicant

#         if job_opening:
#             filters["job_opening"] = job_opening

#         if job_applicant_source:
#             filters["job_applicant_source"] = job_applicant_source

#         # ================= DATE FILTER =================
#         if from_date and to_date:
#             filters["interview_date"] = ["between", [from_date, to_date]]

#         elif from_date:
#             filters["interview_date"] = [">=", from_date]

#         elif to_date:
#             filters["interview_date"] = ["<=", to_date]

#         # ================= FETCH DATA =================
#         data = frappe.get_all(
#             "Applicant Tracker",
#             fields=fields,
#             filters=filters if filters else None,
#             order_by="modified desc",
#             limit_page_length=1000
#         )

#         return {
#             "status": "success",
#             "data": data
#         }

#     except Exception as e:
#         frappe.log_error(frappe.get_traceback(), "Applicant Tracker API Error")
#         return {
#             "status": "error",
#             "message": str(e)
#         }