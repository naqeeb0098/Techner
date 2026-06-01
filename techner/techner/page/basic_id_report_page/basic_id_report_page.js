frappe.pages['basic-id-report-page'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Basic ID Report Page'),
		single_column: true
	});

	// Main container to render our beautiful custom report board
	page.main.append(`
		<div class="container-fluid" style="padding: 10px;">
			<div id="report-board"></div>
		</div>
	`);

	// ---------------- FILTERS ----------------
	let f_email = page.add_field({ fieldtype: 'Data', fieldname: 'email', label: __('Email'), change: refresh_data });
	let f_employee = page.add_field({ fieldtype: 'Link', fieldname: 'employee', options: 'Employee', label: __('Employee Code'), change: refresh_data });
	let f_from = page.add_field({ fieldtype: 'Date', fieldname: 'from_date', label: __('From Date'), change: refresh_data });
	let f_to = page.add_field({ fieldtype: 'Date', fieldname: 'to_date', label: __('To Date'), change: refresh_data });

	// ---------------- CELL FORMATTER ----------------
	function format_cell_value(val, col, row_data) {
		if (val === null || val === undefined) {
			return '<span class="text-muted" style="font-style: italic;">-</span>';
		}
		
		let display_value = val;
		
		// Render clickable links for Link fields
		if (col.fieldtype === 'Link' && col.options && val) {
			display_value = `<a href="/app/${frappe.router.slug(col.options)}/${encodeURIComponent(val)}" style="color: #1a5faa; font-weight: 700; text-decoration: none; border-bottom: 1px dotted #1a5faa;">${val}</a>`;
		} else if (col.fieldtype === 'Date' && val) {
			display_value = frappe.datetime.str_to_user(val);
		} else if (col.fieldtype === 'Datetime' && val) {
			display_value = frappe.datetime.str_to_user(val);
		}
		
		// Highlight the updated/changed cell if it's marked as changed
		const fieldname = col.fieldname;
		const stripped_val = display_value ? String(display_value).replace(/<[^>]*>/g, '').trim() : "";
		if (stripped_val && row_data && row_data._changed_fields && row_data._changed_fields.includes(fieldname)) {
			display_value = `<span style="background-color: #fce8e6; color: #c5221f; border: 1px solid #fad2cf; padding: 2px 6px; border-radius: 4px; font-weight: 600; display: inline-block; box-shadow: 0 1px 2px rgba(0,0,0,0.05);" title="Changed from previous chronological record">${display_value}</span>`;
		}
		
		return display_value;
	}

	// ---------------- LOAD DATA ----------------
	function refresh_data() {
		$('#report-board').html(`
			<div class="text-center p-4 text-muted">
				<div class="spinner-border text-primary spinner-border-sm mb-2" role="status"></div>
				<div style="font-size: 11px;">${__("Loading Report Data...")}</div>
			</div>
		`);
		
		frappe.call({
			method: 'techner.techner.page.basic_id_report_page.basic_id_report_page.get_report_data',
			args: {
				filters: {
					email: f_email.get_value(),
					employee: f_employee.get_value(),
					from_date: f_from.get_value(),
					to_date: f_to.get_value()
				}
			},
			callback: function (r) {
				if (r.message) {
					render_table(r.message.columns, r.message.data);
				} else {
					$('#report-board').html(`
						<div class="text-center p-4 text-muted">
							<i class="fa fa-exclamation-triangle fa-lg mb-2 text-warning"></i>
							<div style="font-size: 11px;">${__("Failed to load report data")}</div>
						</div>
					`);
				}
			}
		});
	}

	// ---------------- RENDER VERTICAL TABLE SECTIONS ----------------
	function render_table(columns, grouped_data) {
		if (!grouped_data || !grouped_data.length) {
			$('#report-board').html(`
				<div class="text-center p-4 text-muted" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; width: 100%;">
					<i class="fa fa-info-circle fa-lg mb-2" style="color: #94a3b8;"></i>
					<p style="font-size: 12px; font-weight: 500; margin: 0;">${__("No records found matching the filters.")}</p>
				</div>
			`);
			return;
		}

		let html = `
		<style>
			/* Beautiful container with horizontal scroll per employee card */
			.report-wrap {
				overflow-x: auto;
				overflow-y: hidden;
				background-color: #ffffff;
				position: relative;
			}
			
			/* Modern custom thin scrollbars for premium look */
			.report-wrap::-webkit-scrollbar {
				width: 6px;
				height: 6px;
			}
			.report-wrap::-webkit-scrollbar-track {
				background: #f1f5f9;
			}
			.report-wrap::-webkit-scrollbar-thumb {
				background: #cbd5e1;
				border-radius: 3px;
			}
			.report-wrap::-webkit-scrollbar-thumb:hover {
				background: #94a3b8;
			}
			
			.report-table {
				width: max-content;
				border-collapse: separate;
				border-spacing: 0;
				font-size: 11px;
				line-height: 1.4;
			}
			.report-table td {
				padding: 6px 10px;
				border-bottom: 1px solid #e2e8f0;
				border-right: 1px solid #e2e8f0;
				vertical-align: middle;
			}
			
			/* First column - Row headers - Sticky left & Styled very bold and dark */
			.vertical-row-header {
				position: sticky;
				left: 0;
				z-index: 10;
				background-color: #f1f5f9 !important;
				color: #0f172a !important;
				font-weight: 700 !important;
				border-right: 2px solid #cbd5e1 !important;
				box-shadow: 2px 0 5px rgba(0,0,0,0.04);
				min-width: 170px;
				max-width: 170px;
				text-align: left;
			}
			
			/* Corner header cell - Sticky left and top */
			.vertical-header-corner {
				position: sticky;
				left: 0;
				top: 0;
				z-index: 30;
				background-color: #e6f0fa !important;
				color: #1e293b !important;
				font-weight: 700;
				border-right: 2px solid #cbd5e1 !important;
				border-bottom: 2px solid #cbd5e1 !important;
				min-width: 170px;
				max-width: 170px;
				text-transform: uppercase;
				font-size: 10px;
				letter-spacing: 0.05em;
			}
			
			/* Column headers - Sticky top */
			.employee-header {
				position: sticky;
				top: 0;
				z-index: 20;
				background-color: #e6f0fa !important;
				color: #1e293b !important;
				font-weight: 700;
				text-align: center;
				border-bottom: 2px solid #cbd5e1 !important;
				min-width: 160px;
				padding: 6px 10px;
			}
			
			/* Cells formatting */
			.report-cell {
				color: #334155;
				background-color: #ffffff;
				text-align: left;
			}
			
			/* Row hover effect */
			.report-table tr:hover td {
				background-color: #f8fafc !important;
			}
			.report-table tr:hover td.vertical-row-header {
				background-color: #e2e8f0 !important;
			}
		</style>
		`;

		grouped_data.forEach(group => {
			html += `
			<div class="card shadow-sm mb-4" style="border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; background: #ffffff;">
				<div class="card-header d-flex justify-content-between align-items-center" style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 16px;">
					<div>
						<span style="font-weight: 700; font-size: 13px; color: #1e3a8a;">${group.employee_title}</span>
						${group.employee_code ? `<span class="badge text-info" style="font-size: 10px; font-weight: 600; background-color: #eff6ff; border: 1px solid #bfdbfe; margin-left: 8px; padding: 3px 6px; border-radius: 4px;">${group.employee_code}</span>` : ''}
					</div>
					<div style="font-size: 11px; color: #64748b; font-weight: 500;">
						${group.email}
					</div>
				</div>
				<div class="card-body p-0">
					<div class="report-wrap">
						<table class="report-table">
							<thead>
								<tr>
									<th class="vertical-header-corner">${__(" ")}</th>
									${group.records.map(rec => {
										let date_str = rec.creation ? frappe.datetime.str_to_user(rec.creation) : "";
										return `
											<th class="employee-header">
												<div style="font-size: 11px; color: #b45309; font-weight: 700; text-transform: uppercase;">
													${rec._record_type}
												</div>
												<div style="font-size: 9px; color: #64748b; margin-top: 2px;">
													${date_str}
												</div>
											</th>
										`;
									}).join('')}
								</tr>
							</thead>
							<tbody>
								${columns.map(col => `
									<tr>
										<td class="vertical-row-header">
											${col.label}
										</td>
										${group.records.map(row_data => {
											let val = row_data[col.fieldname];
											let formatted = format_cell_value(val, col, row_data);
											let tooltip = val ? frappe.utils.escape_html(String(val)) : "";
											
											// Auto-adjust width based on text length. Wrap if text exceeds 240 characters.
											let val_str = val ? String(val) : "";
											let cell_style = "";
											if (val_str.length > 240) {
												cell_style = "white-space: normal; word-break: break-word; min-width: 250px; max-width: 350px;";
											} else {
												cell_style = "white-space: nowrap; width: auto;";
											}
											
											return `<td class="report-cell" style="${cell_style}" title="${tooltip}">${formatted}</td>`;
										}).join('')}
									</tr>
								`).join('')}
							</tbody>
						</table>
					</div>
				</div>
			</div>
			`;
		});

		$('#report-board').html(html);
	}

	// Add primary action and trigger initial load
	page.set_primary_action(__('Refresh'), refresh_data);
	refresh_data();
};