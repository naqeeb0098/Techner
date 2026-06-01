# Copyright (c) 2026, Naqeeb Khan and contributors
# For license information, please see license.txt

import frappe
from frappe import _


def execute(filters=None):
	if not filters:
		filters = {}

	data, active_updates, max_rev_index = get_data(filters)
	columns = get_columns(active_updates, max_rev_index)
	return columns, data


def get_data(filters):
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

	# Fetch all records, ordered by email ASC and creation DESC
	records = frappe.get_all(
		"Basic ID Form",
		filters=conditions,
		fields=fields,
		order_by="email ASC, creation DESC",
	)

	# Fields to check for changes
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
		"date",
	]

	# Group records by email
	records_by_email = {}
	for r in records:
		email_key = r.get("email") or ""
		if email_key not in records_by_email:
			records_by_email[email_key] = []
		records_by_email[email_key].append(r)

	final_data = []
	active_updates = set()
	max_rev_index = 0

	# Process each email group to consolidate into a single row
	for email_key, user_records in records_by_email.items():
		# Reverse to get chronological order (oldest first)
		chrono_records = list(reversed(user_records))

		# The oldest record is the baseline row
		base_row = chrono_records[0]
		base_row["_changed_fields"] = []

		# Compare subsequent records chronologically to their immediate predecessor
		for i in range(1, len(chrono_records)):
			current_rec = chrono_records[i]
			previous_rec = chrono_records[i - 1]
			rev_idx = i  # Update 1 is index 1, Update 2 is index 2, etc.

			if rev_idx > max_rev_index:
				max_rev_index = rev_idx

			for field in compared_fields:
				val_curr = current_rec.get(field)
				val_prev = previous_rec.get(field)

				if values_differ(val_curr, val_prev):
					# Mark this specific update column as active
					active_updates.add((field, rev_idx))

					# Put the updated value into the consolidated row
					upd_fieldname = f"{field}_upd_{rev_idx}"
					base_row[upd_fieldname] = val_curr

					# Highlight the updated cell
					base_row["_changed_fields"].append(upd_fieldname)

		final_data.append(base_row)

	# Sort final consolidated data by email
	final_data.sort(key=lambda x: x.get("email") or "")

	return final_data, active_updates, max_rev_index


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


def get_columns(active_updates, max_rev_index):
	base_cols = [
		{"fieldname": "name", "label": _("ID"), "fieldtype": "Link", "options": "Basic ID Form", "width": 150},
		{"fieldname": "creation", "label": _("Creation"), "fieldtype": "Datetime", "width": 140},
		{"fieldname": "test_lable", "label": _("Employee Code"), "fieldtype": "Link", "options": "Employee", "width": 120},
		{"fieldname": "full_name", "label": _("Full Name"), "fieldtype": "Data", "width": 150},
		{"fieldname": "email", "label": _("Email"), "fieldtype": "Data", "width": 150},
		{"fieldname": "mobile_number", "label": _("Mobile Number"), "fieldtype": "Data", "width": 120},
		{"fieldname": "date_of_birth", "label": _("Date of Birth"), "fieldtype": "Date", "width": 100},
		{
			"fieldname": "current_residential_address",
			"label": _("Current Residential Address"),
			"fieldtype": "Data",
			"width": 200,
		},
		{"fieldname": "postal_code", "label": _("Postal Code"), "fieldtype": "Data", "width": 90},
		{"fieldname": "permanent_home_address", "label": _("Permanent Home Address"), "fieldtype": "Data", "width": 200},
		{"fieldname": "nationality_all", "label": _("Nationality"), "fieldtype": "Data", "width": 100},
		{"fieldname": "home_telephone_number", "label": _("Home Telephone Number"), "fieldtype": "Data", "width": 120},
		{"fieldname": "cnicid_number", "label": _("CNIC/ID Number"), "fieldtype": "Data", "width": 130},
		{"fieldname": "passport_num", "label": _("Passport Number"), "fieldtype": "Data", "width": 120},
		{"fieldname": "name1", "label": _("Kin Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "contact_number", "label": _("Kin Contact"), "fieldtype": "Data", "width": 120},
		{"fieldname": "postal_address", "label": _("Kin Address"), "fieldtype": "Data", "width": 150},
		{"fieldname": "relationship", "label": _("Kin Relationship"), "fieldtype": "Data", "width": 100},
		{"fieldname": "email_address", "label": _("Kin Email"), "fieldtype": "Data", "width": 150},
		{
			"fieldname": "have_you_ever_been_convicted_of_a_criminal_offense",
			"label": _("Convicted?"),
			"fieldtype": "Data",
			"width": 100,
		},
		{
			"fieldname": "please_specify_about_criminal_offense",
			"label": _("Criminal Details"),
			"fieldtype": "Data",
			"width": 150,
		},
		{
			"fieldname": "have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
			"label": _("Lost Job due to Drug?"),
			"fieldtype": "Data",
			"width": 120,
		},
		{
			"fieldname": "please_specify_about_drug_or_substance_misuse",
			"label": _("Drug Details"),
			"fieldtype": "Data",
			"width": 150,
		},
		{"fieldname": "bank_name", "label": _("Bank Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "name_on_the_account", "label": _("Name on Account"), "fieldtype": "Data", "width": 120},
		{"fieldname": "iban", "label": _("IBAN"), "fieldtype": "Data", "width": 150},
		{"fieldname": "swift_code", "label": _("Swift Code"), "fieldtype": "Data", "width": 100},
		{"fieldname": "account_currency", "label": _("Currency"), "fieldtype": "Data", "width": 80},
		{"fieldname": "branch_address", "label": _("Branch Address"), "fieldtype": "Data", "width": 150},
		{"fieldname": "branch_id", "label": _("Branch ID"), "fieldtype": "Data", "width": 90},
		{"fieldname": "branch_name", "label": _("Branch Name"), "fieldtype": "Data", "width": 120},
		{"fieldname": "date", "label": _("Date"), "fieldtype": "Date", "width": 100},
	]

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
		"date",
	]

	final_cols = []
	for col in base_cols:
		final_cols.append(col)
		fname = col["fieldname"]
		if fname in compared_fields:
			# Check for any active updates chronologically for this field across the dataset
			for rev_idx in range(1, max_rev_index + 1):
				if (fname, rev_idx) in active_updates:
					final_cols.append(
						{
							"fieldname": f"{fname}_upd_{rev_idx}",
							"label": f"{col['label']} (Upd {rev_idx})",
							"fieldtype": col["fieldtype"],
							"options": col.get("options"),
							"width": col["width"],
						}
					)
	return final_cols





# # Copyright (c) 2026, Naqeeb Khan and contributors
# # For license information, please see license.txt

# import frappe
# from frappe import _


# def execute(filters=None):
# 	if not filters:
# 		filters = {}

# 	data, active_updates, max_rev_index = get_data(filters)
# 	columns = get_columns(active_updates, max_rev_index)
# 	return columns, data


# def get_data(filters):
# 	conditions = {}

# 	if filters.get("email"):
# 		conditions["email"] = ["like", f"%{filters.get('email')}%"]

# 	if filters.get("employee"):
# 		conditions["test_lable"] = filters.get("employee")

# 	if filters.get("from_date") and filters.get("to_date"):
# 		conditions["creation"] = ["between", [filters.get("from_date") + " 00:00:00", filters.get("to_date") + " 23:59:59"]]
# 	elif filters.get("from_date"):
# 		conditions["creation"] = [">=", filters.get("from_date") + " 00:00:00"]
# 	elif filters.get("to_date"):
# 		conditions["creation"] = ["<=", filters.get("to_date") + " 23:59:59"]

# 	fields = [
# 		"name",
# 		"creation",
# 		"test_lable",
# 		"full_name",
# 		"email",
# 		"mobile_number",
# 		"date_of_birth",
# 		"current_residential_address",
# 		"postal_code",
# 		"permanent_home_address",
# 		"nationality_all",
# 		"home_telephone_number",
# 		"cnicid_number",
# 		"passport_num",
# 		"name1",
# 		"contact_number",
# 		"postal_address",
# 		"relationship",
# 		"email_address",
# 		"have_you_ever_been_convicted_of_a_criminal_offense",
# 		"please_specify_about_criminal_offense",
# 		"have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
# 		"please_specify_about_drug_or_substance_misuse",
# 		"bank_name",
# 		"name_on_the_account",
# 		"iban",
# 		"swift_code",
# 		"account_currency",
# 		"branch_address",
# 		"branch_id",
# 		"branch_name",
# 		"date",
# 	]

# 	# Fetch all records, ordered by email ASC and creation DESC
# 	records = frappe.get_all(
# 		"Basic ID Form",
# 		filters=conditions,
# 		fields=fields,
# 		order_by="email ASC, creation DESC",
# 	)

# 	# Fields to check for changes
# 	compared_fields = [
# 		"full_name",
# 		"email",
# 		"mobile_number",
# 		"date_of_birth",
# 		"current_residential_address",
# 		"postal_code",
# 		"permanent_home_address",
# 		"nationality_all",
# 		"home_telephone_number",
# 		"cnicid_number",
# 		"passport_num",
# 		"test_lable",
# 		"name1",
# 		"contact_number",
# 		"postal_address",
# 		"relationship",
# 		"email_address",
# 		"have_you_ever_been_convicted_of_a_criminal_offense",
# 		"please_specify_about_criminal_offense",
# 		"have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
# 		"please_specify_about_drug_or_substance_misuse",
# 		"bank_name",
# 		"name_on_the_account",
# 		"iban",
# 		"swift_code",
# 		"account_currency",
# 		"branch_address",
# 		"branch_id",
# 		"branch_name",
# 		"date",
# 	]

# 	# Group records by email
# 	records_by_email = {}
# 	for r in records:
# 		email_key = r.get("email") or ""
# 		if email_key not in records_by_email:
# 			records_by_email[email_key] = []
# 		records_by_email[email_key].append(r)

# 	final_data = []
# 	active_updates = set()
# 	max_rev_index = 0

# 	# Process each email group to consolidate into a single row
# 	for email_key, user_records in records_by_email.items():
# 		# Reverse to get chronological order (oldest first)
# 		chrono_records = list(reversed(user_records))

# 		# The oldest record is the baseline row
# 		base_row = chrono_records[0]
# 		base_row["_changed_fields"] = []

# 		# Compare subsequent records chronologically to their immediate predecessor
# 		for i in range(1, len(chrono_records)):
# 			current_rec = chrono_records[i]
# 			previous_rec = chrono_records[i - 1]
# 			rev_idx = i  # Update 1 is index 1, Update 2 is index 2, etc.

# 			if rev_idx > max_rev_index:
# 				max_rev_index = rev_idx

# 			for field in compared_fields:
# 				val_curr = current_rec.get(field)
# 				val_prev = previous_rec.get(field)

# 				if values_differ(val_curr, val_prev):
# 					# Mark this specific update column as active
# 					active_updates.add((field, rev_idx))

# 					# Put the updated value into the consolidated row
# 					upd_fieldname = f"{field}_upd_{rev_idx}"
# 					base_row[upd_fieldname] = val_curr

# 					# Highlight the updated cell
# 					base_row["_changed_fields"].append(upd_fieldname)

# 		final_data.append(base_row)

# 	# Sort final consolidated data by email
# 	final_data.sort(key=lambda x: x.get("email") or "")

# 	return final_data, active_updates, max_rev_index


# def values_differ(val1, val2):
# 	import datetime

# 	# Normalize Date/Datetime/None to comparable strings
# 	if isinstance(val1, (datetime.date, datetime.datetime)):
# 		val1 = val1.strftime("%Y-%m-%d")
# 	if isinstance(val2, (datetime.date, datetime.datetime)):
# 		val2 = val2.strftime("%Y-%m-%d")

# 	v1 = "" if val1 is None else str(val1).strip()
# 	v2 = "" if val2 is None else str(val2).strip()

# 	return v1 != v2


# def get_columns(active_updates, max_rev_index):
# 	base_cols = [
# 		{"fieldname": "name", "label": _("ID"), "fieldtype": "Link", "options": "Basic ID Form", "width": 150},
# 		{"fieldname": "creation", "label": _("Creation"), "fieldtype": "Datetime", "width": 140},
# 		{"fieldname": "test_lable", "label": _("Employee Code"), "fieldtype": "Link", "options": "Employee", "width": 120},
# 		{"fieldname": "full_name", "label": _("Full Name"), "fieldtype": "Data", "width": 150},
# 		{"fieldname": "email", "label": _("Email"), "fieldtype": "Data", "width": 150},
# 		{"fieldname": "mobile_number", "label": _("Mobile Number"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "date_of_birth", "label": _("Date of Birth"), "fieldtype": "Date", "width": 100},
# 		{
# 			"fieldname": "current_residential_address",
# 			"label": _("Current Residential Address"),
# 			"fieldtype": "Data",
# 			"width": 200,
# 		},
# 		{"fieldname": "postal_code", "label": _("Postal Code"), "fieldtype": "Data", "width": 90},
# 		{"fieldname": "permanent_home_address", "label": _("Permanent Home Address"), "fieldtype": "Data", "width": 200},
# 		{"fieldname": "nationality_all", "label": _("Nationality"), "fieldtype": "Data", "width": 100},
# 		{"fieldname": "home_telephone_number", "label": _("Home Telephone Number"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "cnicid_number", "label": _("CNIC/ID Number"), "fieldtype": "Data", "width": 130},
# 		{"fieldname": "passport_num", "label": _("Passport Number"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "name1", "label": _("Kin Name"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "contact_number", "label": _("Kin Contact"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "postal_address", "label": _("Kin Address"), "fieldtype": "Data", "width": 150},
# 		{"fieldname": "relationship", "label": _("Kin Relationship"), "fieldtype": "Data", "width": 100},
# 		{"fieldname": "email_address", "label": _("Kin Email"), "fieldtype": "Data", "width": 150},
# 		{
# 			"fieldname": "have_you_ever_been_convicted_of_a_criminal_offense",
# 			"label": _("Convicted?"),
# 			"fieldtype": "Data",
# 			"width": 100,
# 		},
# 		{
# 			"fieldname": "please_specify_about_criminal_offense",
# 			"label": _("Criminal Details"),
# 			"fieldtype": "Data",
# 			"width": 150,
# 		},
# 		{
# 			"fieldname": "have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
# 			"label": _("Lost Job due to Drug?"),
# 			"fieldtype": "Data",
# 			"width": 120,
# 		},
# 		{
# 			"fieldname": "please_specify_about_drug_or_substance_misuse",
# 			"label": _("Drug Details"),
# 			"fieldtype": "Data",
# 			"width": 150,
# 		},
# 		{"fieldname": "bank_name", "label": _("Bank Name"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "name_on_the_account", "label": _("Name on Account"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "iban", "label": _("IBAN"), "fieldtype": "Data", "width": 150},
# 		{"fieldname": "swift_code", "label": _("Swift Code"), "fieldtype": "Data", "width": 100},
# 		{"fieldname": "account_currency", "label": _("Currency"), "fieldtype": "Data", "width": 80},
# 		{"fieldname": "branch_address", "label": _("Branch Address"), "fieldtype": "Data", "width": 150},
# 		{"fieldname": "branch_id", "label": _("Branch ID"), "fieldtype": "Data", "width": 90},
# 		{"fieldname": "branch_name", "label": _("Branch Name"), "fieldtype": "Data", "width": 120},
# 		{"fieldname": "date", "label": _("Date"), "fieldtype": "Date", "width": 100},
# 	]

# 	compared_fields = [
# 		"full_name",
# 		"email",
# 		"mobile_number",
# 		"date_of_birth",
# 		"current_residential_address",
# 		"postal_code",
# 		"permanent_home_address",
# 		"nationality_all",
# 		"home_telephone_number",
# 		"cnicid_number",
# 		"passport_num",
# 		"test_lable",
# 		"name1",
# 		"contact_number",
# 		"postal_address",
# 		"relationship",
# 		"email_address",
# 		"have_you_ever_been_convicted_of_a_criminal_offense",
# 		"please_specify_about_criminal_offense",
# 		"have_you_ever_lost_a_job_due_to_drug_or_substance_misuse",
# 		"please_specify_about_drug_or_substance_misuse",
# 		"bank_name",
# 		"name_on_the_account",
# 		"iban",
# 		"swift_code",
# 		"account_currency",
# 		"branch_address",
# 		"branch_id",
# 		"branch_name",
# 		"date",
# 	]

# 	final_cols = []
# 	for col in base_cols:
# 		final_cols.append(col)
# 		fname = col["fieldname"]
# 		if fname in compared_fields:
# 			# Check for any active updates chronologically for this field across the dataset
# 			for rev_idx in range(1, max_rev_index + 1):
# 				if (fname, rev_idx) in active_updates:
# 					final_cols.append(
# 						{
# 							"fieldname": f"{fname}_upd_{rev_idx}",
# 							"label": f"{col['label']} (Upd {rev_idx})",
# 							"fieldtype": col["fieldtype"],
# 							"options": col.get("options"),
# 							"width": col["width"],
# 						}
# 					)
# 	return final_cols
