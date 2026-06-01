// Copyright (c) 2026, Naqeeb Khan and contributors
// For license information, please see license.txt

frappe.query_reports["Basic ID Report"] = {
	"filters": [
		{
			"fieldname": "email",
			"label": __("Email"),
			"fieldtype": "Data",
			"width": "100"
		},
		{
			"fieldname": "employee",
			"label": __("Employee Code"),
			"fieldtype": "Link",
			"options": "Employee",
			"width": "120"
		},
		{
			"fieldname": "from_date",
			"label": __("From Date"),
			"fieldtype": "Date",
			"width": "100"
		},
		{
			"fieldname": "to_date",
			"label": __("To Date"),
			"fieldtype": "Date",
			"width": "100"
		}
	],

	"onload": function (report) {
		// Style column headers specifically to a professional light blue / grey color
		frappe.dom.set_style(`
			.dt-row--header, .dt-row--header .dt-cell, .slick-header-columns, .slick-header-column {
				background-color: #e6f0fa !important;
				background-image: none !important;
				color: #1e293b !important;
				font-weight: 600 !important;
				border-right: 1px solid #cbd5e1 !important;
				border-bottom: 2px solid #cbd5e1 !important;
			}
			.dt-row--header .dt-cell .dt-cell__content, .slick-header-column .slick-column-name {
				color: #1e293b !important;
				font-weight: 600 !important;
			}
		`);
	},

	"formatter": function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);
		
		const fieldname = column.fieldname || column.id;
		
		// Strip HTML tags to check if the actual text content is empty or blank
		const stripped_val = value ? String(value).replace(/<[^>]*>/g, '').trim() : "";
		
		if (stripped_val && data && data._changed_fields && data._changed_fields.includes(fieldname)) {
			// A highly professional, clean soft premium light red highlight
			value = `<span style="background-color: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; padding: 3px 6px; border-radius: 4px; font-weight: 500; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" title="Changed from previous chronological record">${value}</span>`;
		}
		
		return value;
	}
};



// // Copyright (c) 2026, Naqeeb Khan and contributors
// // For license information, please see license.txt

// frappe.query_reports["Basic ID Report"] = {
// 	"filters": [
// 		{
// 			"fieldname": "email",
// 			"label": __("Email"),
// 			"fieldtype": "Data",
// 			"width": "100"
// 		},
// 		{
// 			"fieldname": "employee",
// 			"label": __("Employee Code"),
// 			"fieldtype": "Link",
// 			"options": "Employee",
// 			"width": "120"
// 		},
// 		{
// 			"fieldname": "from_date",
// 			"label": __("From Date"),
// 			"fieldtype": "Date",
// 			"width": "100"
// 		},
// 		{
// 			"fieldname": "to_date",
// 			"label": __("To Date"),
// 			"fieldtype": "Date",
// 			"width": "100"
// 		}
// 	],

// 	"onload": function (report) {
// 		// Style column headers specifically to a professional light blue / grey color
// 		frappe.dom.set_style(`
// 			.dt-row--header, .dt-row--header .dt-cell, .slick-header-columns, .slick-header-column {
// 				background-color: #e6f0fa !important;
// 				background-image: none !important;
// 				color: #1e293b !important;
// 				font-weight: 600 !important;
// 				border-right: 1px solid #cbd5e1 !important;
// 				border-bottom: 2px solid #cbd5e1 !important;
// 			}
// 			.dt-row--header .dt-cell .dt-cell__content, .slick-header-column .slick-column-name {
// 				color: #1e293b !important;
// 				font-weight: 600 !important;
// 			}
// 		`);
// 	},

// 	"formatter": function (value, row, column, data, default_formatter) {
// 		value = default_formatter(value, row, column, data);
		
// 		const fieldname = column.fieldname || column.id;
		
// 		// Strip HTML tags to check if the actual text content is empty or blank
// 		const stripped_val = value ? String(value).replace(/<[^>]*>/g, '').trim() : "";
		
// 		if (stripped_val && data && data._changed_fields && data._changed_fields.includes(fieldname)) {
// 			// A highly professional, clean soft premium light red highlight
// 			value = `<span style="background-color: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; padding: 3px 6px; border-radius: 4px; font-weight: 500; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" title="Changed from previous chronological record">${value}</span>`;
// 		}
		
// 		return value;
// 	}
// };
