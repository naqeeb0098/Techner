app_name = "techner"
app_title = "Techner"
app_publisher = "Naqeeb Khan"
app_description = "Techner"
app_email = "techner123@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "techner",
# 		"logo": "/assets/techner/logo.png",
# 		"title": "Techner",
# 		"route": "/techner",
# 		"has_permission": "techner.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/techner/css/techner.css"
# app_include_js = "/assets/techner/js/techner.js"

# include js, css files in header of web template
# web_include_css = "/assets/techner/css/techner.css"
# web_include_js = [
#     "/assets/techner/js/job_applicant_webform.js"
# ]


# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "techner/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
	"Leave Application": "public/js/leave_application.js",
	"HD Ticket": "public/js/hd_ticket.js",
	"Notification": "public/js/notification.js",
	"Job Applicant": "public/js/job_applicant.js",
	"Application Form": "public/js/application_form.js"
}
doctype_list_js = {
	"Job Applicant": "public/js/job_applicant_list.js",
	"Application Form": "public/js/application_form_list.js"
}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "techner/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "techner.utils.jinja_methods",
# 	"filters": "techner.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "techner.install.before_install"
# after_install = "techner.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "techner.uninstall.before_uninstall"
# after_uninstall = "techner.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "techner.utils.before_app_install"
# after_app_install = "techner.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "techner.utils.before_app_uninstall"
# after_app_uninstall = "techner.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "techner.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

permission_query_conditions = {
	"Leave Application": "techner.techner.custom.leave_application_permission.get_permission_query_conditions",
	"Employee Time Sheet": "techner.techner.custom.employee_time_sheet_permission.get_permission_query_conditions",
}

has_permission = {
	"Leave Application": "techner.techner.custom.leave_application_permission.has_permission",
	"Employee Time Sheet": "techner.techner.custom.employee_time_sheet_permission.has_permission"
}

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	# Global: Child Table Notification Engine (Notification doctype ke against)
	"*": {
		"before_save": "techner.techner.custom.notification_child_handler.process_notification_doc_event",
		"after_save": "techner.techner.custom.notification_child_handler.process_notification_doc_event",
		"on_submit": "techner.techner.custom.notification_child_handler.process_notification_doc_event",
		"on_cancel": "techner.techner.custom.notification_child_handler.process_notification_doc_event",
	},
	"Job Applicant": {
		"validate": "techner.techner.custom.job_applicant.validate",
		"on_update": "techner.techner.custom.job_applicant.extract_resume_text"
	},
	"Application Form": {
		"validate": "techner.techner.custom.job_applicant.validate",
		"on_update": "techner.techner.custom.job_applicant.extract_resume_text"
	},
	"File": {
		"after_insert": "techner.techner.custom.job_applicant.file_changed",
		"on_trash": "techner.techner.custom.job_applicant.file_changed"
	},
	"HD Ticket": {
		"validate": "techner.techner.custom.hd_ticket.update_is_responded"
	},
	
	"Utility Applicants": {
		"validate": "techner.techner.custom.utility_applicants.validate",
	},
	
	"General Applicant": {
		"validate": "techner.techner.custom.job_applicant.validate"
	},
	"Expense Claim": {
		"validate":"techner.techner.custom.expense_claim.make_attachments_public"
	}
}

# Scheduled Tasks
# ---------------

scheduler_events = {
	"hourly": [
		"techner.techner.custom.hd_ticket.send_auto_resolution_warning",
		"techner.techner.custom.notification_child_handler.process_notification_hourly",
		"techner.techner.custom.child_table_notification_scheduler.run_hourly",
	],
	"daily": [
		"techner.techner.custom.onboarding_notification.send_onboarding_tracker_notifications",
		"techner.techner.custom.notification_child_handler.process_notification_daily",
		"techner.techner.custom.child_table_notification_scheduler.run_daily",
	]
}

# Testing
# -------

# before_tests = "techner.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "techner.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "techner.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["techner.utils.before_request"]
# after_request = ["techner.utils.after_request"]

# Job Events
# ----------
# before_job = ["techner.utils.before_job"]
# after_job = ["techner.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"techner.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

