frappe.pages['applicant-tracker-report'].on_page_load = function (wrapper) {

	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Applicant Tracker Report'),
		single_column: true
	});

	page.main.append(`
		<div class="container-fluid" style="padding:15px;">
			<div class="card shadow-sm">
				<div class="card-body p-0">
					<div id="tracker-board"></div>
				</div>
			</div>
		</div>
	`);

	// ==========================================
	//  COLUMN WIDTH SETTINGS
	const COLUMN_WIDTHS = {
		'job_applicant': '120px',
		'applicant_name': '150px',
		'job_applicant_source': '150px',
		'job_opening': '150px',
		'job_opening_title': '135px',
		'role': '120px',
		'initial_screening_date': '90px',
		'interviewer_name': '100px',
		'nationality': '100px',
		'education': '180px',
		'experience': '250px',
		'foreign_education': '250px',
		'foreign_experience': '150px',
		'cv_fit_for_role': '120px',
		'competence_impression': '120px',
		'management_skills': '120px',
		'relevant_experience': '120px',
		'customer_relationship': '120px',
		'english_communication': '120px',
		'contract_permanent_and_benefits': '180px',
		'notice_period': '100px',
		'location': '120px',
		'current_salary': '100px',
		'expected_salary': '100px',
		'conclusionfeedback': '350px',
		'recommendation': '130px',
		'p2': '70px',
		'reasoning': '150px',
		'certifications_and_tools': '200px',
		'interview_date': '90px',
		'final_conclusion': '350px',
		'client_interview_history': '250px',
		'skillset': '500px',
		'skills': '500px'
	};

	// ---------------- FILTERS ----------------
	let f_applicant = page.add_field({ fieldtype: 'Link', fieldname: 'job_applicant', options: 'Job Applicant', label: 'Job Applicant', only_select: true, change: refresh_data });
	let f_opening   = page.add_field({ fieldtype: 'Link', fieldname: 'job_opening', options: 'Job Opening', label: 'Job Opening', only_select: true, change: refresh_data });
	let f_role      = page.add_field({ fieldtype: 'Data', fieldname: 'role', label: 'Role', change: refresh_data });
	let f_recommendation = page.add_field({ fieldtype: 'Select', fieldname: 'recommendation', label: 'Recommendation', options: '\nRecommended\nNot Recommended\nRecommended + Expensive', change: refresh_data });
	let f_experience      = page.add_field({ fieldtype: 'Data', fieldname: 'experience', label: 'Experience', change: refresh_data });
	let f_final_conclusion = page.add_field({ fieldtype: 'Data', fieldname: 'final_conclusion', label: 'Final Conclusion', change: refresh_data });
	let f_location  = page.add_field({ fieldtype: 'Data', fieldname: 'location', label: 'Location', change: refresh_data });
	let f_name      = page.add_field({ fieldtype: 'Data', fieldname: 'applicant_name', label: 'Applicant Name', change: refresh_data });
	let f_source    = page.add_field({ fieldtype: 'Data', fieldname: 'job_applicant_source', label: 'Source', change: refresh_data });

	let data = [], meta = {}, order = [];

	// ---------------- LOAD DATA ----------------
	function refresh_data() {
		$('#tracker-board').html(`<div class="text-center p-5 text-muted">Loading...</div>`);
		frappe.call({
			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.get_tracker_data',
			args: {
				filters: {
					job_applicant:       f_applicant.get_value(),
					job_opening:         f_opening.get_value(),
					applicant_name:      f_name.get_value(),
					job_applicant_source: f_source.get_value(),
					role:                f_role.get_value(),
					recommendation:      f_recommendation.get_value(),
					experience:          f_experience.get_value(),
					final_conclusion:    f_final_conclusion.get_value(),
					location:            f_location.get_value()
				}
			},
			callback: function (r) {
				if (r.message) {
					data  = r.message.data        || [];
					meta  = r.message.field_meta   || {};
					order = r.message.fields_order || [];
					render_table();
				}
			}
		});
	}

	// ---------------- RENDER TABLE ----------------
	function render_table() {

		let html = `
		<style>
			.atbl-wrap {
				overflow-x: auto;
				overflow-y: auto;
				max-height: calc(100vh - 160px);
				border-radius: 10px;
				border: 1px solid #c8d6e5;
			}
			.atbl {
				width: 100%;
				border-collapse: collapse;
				font-size: 13px;
			}
			.atbl thead tr {
				position: sticky;
				top: 0;
				z-index: 50;
			}
			.atbl thead th {
				padding: 6px 8px;
				font-size: 11px;
				font-weight: 600;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				color: #e8edf2;
				background: rgb(24, 126, 139);
				border-right: 1px solid rgb(58, 138, 131);
				border-bottom: 2px solid rgb(35, 142, 156);
				white-space: normal;
				word-break: break-word;
				position: sticky;
				top: 0;
			}
			.atbl thead th.th-link   { background: rgb(63, 170, 138); border-right-color: rgb(63, 170, 138); }
			.atbl thead th.th-select { background: rgb(39, 173, 91);  border-right-color: rgb(29, 170, 104); }
			.atbl thead th.th-date   { background: rgb(67, 136, 113); border-right-color: rgb(67, 136, 113); }
			.atbl thead th.th-text   { background: rgb(167, 175, 53); border-right-color: rgb(167, 175, 53); }
			.atbl thead th.th-id     { background: rgb(31, 92, 73);   border-right-color: rgb(31, 92, 73); }

			.atbl tbody tr:nth-child(odd)  { background: #f4f7fb; }
			.atbl tbody tr:nth-child(even) { background: #eaf0f8; }
			.atbl tbody tr:hover { background: #d6e4f5; transition: background 0.15s; }

			.atbl tbody td {
				padding: 0;
				border-right: 1px solid #dce6f0;
				border-bottom: 1px solid #dce6f0;
				vertical-align: middle;
				position: relative;
			}
			.atbl tbody td:last-child { border-right: none; }

			/* ID column */
			.atbl td.col-id {
				padding: 6px 8px;
				white-space: nowrap;
				vertical-align: middle;
			}
			.atbl td.col-id a {
				font-family: monospace;
				font-size: 12px;
				font-weight: 700;
				color: #1a5faa;
				text-decoration: none;
			}
			.atbl td.col-id a:hover { color: #0d3f7a; text-decoration: underline; }

			/* Date column */
			.atbl td.col-date {
				padding: 6px 8px;
				white-space: nowrap;
				font-size: 12px;
				color: #4a6080;
				font-weight: 500;
				vertical-align: middle;
				text-align: center;
			}

			/* ============================================================
			   DISPLAY-EDIT PATTERN
			   Har cell mein do cheezein hain:
			   1. .cell-display  — normal state mein dikhta hai (wrap hoga)
			   2. .cell-editor   — click karne pe dikhta hai (actual input)
			   ============================================================ */

			.cell-display {
				display: block;
				width: 100%;
				min-height: 24px;
				padding: 6px 8px;
				font-size: 13px;
				color: #1e2d3d;
				line-height: 1.5;
				cursor: text;
				box-sizing: border-box;
				/* WRAP — yahi asli fix hai */
				white-space: pre-wrap;
				word-break: break-word;
				overflow-wrap: break-word;
			}
			.cell-display:hover { background: rgba(26,95,170,0.07); }

			/* Placeholder style jab value khaali ho */
			.cell-display.empty {
				color: #b0bec5;
				font-style: italic;
			}

			/* Select display — arrow dikhao */
			.cell-display.sel-display {
				padding-right: 28px;
				position: relative;
				cursor: pointer;
			}
			.cell-display.sel-display::after {
				content: '▾';
				position: absolute;
				right: 10px;
				top: 50%;
				transform: translateY(-50%);
				color: #7a90a8;
				font-size: 11px;
				pointer-events: none;
			}

			/* Editor — hidden by default */
			.cell-editor {
				display: none;
				width: 100%;
			}

			/* Jab editing mode ho */
			.td-editing .cell-display { display: none; }
			.td-editing .cell-editor  { display: block; }

			/* --- Actual input inside editor --- */
			.direct-input {
				display: block;
				width: 100%;
				min-height: 24px;
				padding: 0 8px;
				font-size: 13px;
				color: #1e2d3d;
				background: #fff;
				border: none;
				outline: none;
				font-family: inherit;
				box-sizing: border-box;
				line-height: 24px;
				box-shadow: inset 0 0 0 2px #1a5faa;
			}

			/* --- Select inside editor --- */
			.direct-select {
				display: block;
				width: 100%;
				min-height: 24px;
				padding: 0 8px;
				font-size: 13px;
				color: #1e2d3d;
				background: #fff;
				border: none;
				outline: none;
				font-family: inherit;
				box-sizing: border-box;
				cursor: pointer;
				-webkit-appearance: auto;
				box-shadow: inset 0 0 0 2px #1a5faa;
			}

			/* --- Textarea --- */
			textarea.direct-textarea {
				display: block;
				width: 100%;
				min-height: 24px;
				padding: 6px 8px;
				font-size: 12px;
				line-height: 1.6;
				color: #1e2d3d;
				background: transparent;
				border: none;
				outline: none;
				font-family: inherit;
				box-sizing: border-box;
				resize: vertical;
				white-space: pre-wrap;
				word-wrap: break-word;
				overflow-wrap: break-word;
			}
			textarea.direct-textarea:hover { background: rgba(26,95,170,0.07); }
			textarea.direct-textarea:focus {
				background: #fff;
				box-shadow: inset 0 0 0 2px #1a5faa;
			}

			/* Link field k frappe input ko clean karo */
			.link-wrap .frappe-control { margin: 0 !important; }
			.link-wrap .form-control,
			.link-wrap input[type="text"] {
				border: none !important;
				box-shadow: inset 0 0 0 2px #1a5faa !important;
				border-radius: 0 !important;
				height: 24px !important;
				line-height: 24px !important;
				padding: 0 8px !important;
				background: #fff !important;
			}
			.link-wrap .link-btn,
			.link-wrap .btn,
			.link-wrap .add-btn,
			.link-wrap .input-group-append { display: none !important; }
		</style>

		<div class="atbl-wrap">
		<table class="atbl">
			<thead>
				<tr>
		<th class="th-id" style="min-width:50px; width:50px">#</th>
		<th class="th-id" style="min-width:130px">Applicant ID</th>
		${order.map(f => {
			let m = meta[f];
			let custom_w = COLUMN_WIDTHS[f];
			
			if (m?.fieldtype === 'Date') {
				let w = custom_w || '90px';
				return `<th class="th-date" style="min-width:${w}; max-width:${w}; width:${w};">${m?.label || f}</th>`;
			}
			
			let w = custom_w || '100px';
			if (!custom_w) {
				if (m?.fieldtype === 'Link')  w = '120px';
				else if (m?.fieldtype === 'Select') w = '120px';
				else if (['Text','Long Text','Small Text'].includes(m?.fieldtype)) w = '180px';
			}

			let cls = 'th-data';
			if (m?.fieldtype === 'Link')   cls = 'th-link';
			else if (m?.fieldtype === 'Select') cls = 'th-select';
			else if (['Text','Long Text','Small Text'].includes(m?.fieldtype)) cls = 'th-text';

			return `<th class="${cls}" style="min-width:${w}; max-width:${w};">${m?.label || f}</th>`;
		}).join('')}
				</tr>
			</thead>
			<tbody>
		`;

		if (!data.length) {
			html += `<tr><td colspan="${order.length + 2}"
				style="text-align:center;padding:48px;color:#8aa0ba;font-size:14px;">
				No records found
			</td></tr>`;
		}

		data.forEach((row, idx) => {
			html += `<tr>
				<td class="col-id" style="text-align:center;font-weight:600;width:50px;">${idx + 1}</td>
				<td class="col-id">
					<a href="/app/applicant-tracker/${row.name}">${row.name}</a>
				</td>`;

			order.forEach(f => {
				let m   = meta[f];
				let val = row[f] || '';
				let esc = frappe.utils.escape_html(val);

				let custom_w = COLUMN_WIDTHS[f];

				// ---- LINK ----
				if (m?.fieldtype === 'Link') {
					let minW = custom_w || '120px';
					html += `
					<td style="min-width:${minW}; max-width:${minW};" data-doc="${row.name}" data-field="${f}" data-type="link">
						<span class="cell-display ${val ? '' : 'empty'}">${val || '—'}</span>
						<div class="cell-editor">
							<div class="link-wrap"
								data-doc="${row.name}"
								data-field="${f}"
								data-options="${m.options}"
								data-value="${esc}">
							</div>
						</div>
					</td>`;
				}

				// ---- SELECT ----
				else if (m?.fieldtype === 'Select') {
					let minW = custom_w || '120px';
					let opts = (m.options || '').split('\n')
						.map(o => o ? `<option value="${o}" ${o == val ? 'selected' : ''}>${o}</option>` : '')
						.join('');
					html += `
					<td style="min-width:${minW}; max-width:${minW};" data-doc="${row.name}" data-field="${f}" data-type="select">
						<span class="cell-display sel-display ${val ? '' : 'empty'}">${val || '—'}</span>
						<div class="cell-editor">
							<select class="direct-select cell-sel-input"
								data-doc="${row.name}"
								data-field="${f}">
								<option value=""></option>
								${opts}
							</select>
						</div>
					</td>`;
				}

				// ---- DATE ----
				else if (m?.fieldtype === 'Date') {
					let minW = custom_w || '90px';
					html += `<td class="col-date" style="min-width:${minW}; max-width:${minW}; width:${minW};">${val}</td>`;
				}

				// ---- TEXT / LONG TEXT / SMALL TEXT ----
				else if (['Text','Long Text','Small Text'].includes(m?.fieldtype)) {
					let defW = m?.fieldtype === 'Long Text' ? '200px' : m?.fieldtype === 'Text' ? '180px' : '160px';
					let minW = custom_w || defW;
					html += `
					<td style="min-width:${minW}; max-width:${minW}; padding:0;" data-doc="${row.name}" data-field="${f}" data-type="text">
						<span class="cell-display ${val ? '' : 'empty'}">${esc || '—'}</span>
						<div class="cell-editor">
							<textarea class="direct-textarea cell-textarea"
								data-doc="${row.name}"
								data-field="${f}">${esc}</textarea>
						</div>
					</td>`;
				}

				// ---- DATA (short input) ----
				else {
					let minW = custom_w || '100px';
					html += `
					<td style="min-width:${minW}; max-width:${minW};" data-doc="${row.name}" data-field="${f}" data-type="data">
						<span class="cell-display ${val ? '' : 'empty'}">${esc || '—'}</span>
						<div class="cell-editor">
							<input class="direct-input cell-data-input"
								data-doc="${row.name}"
								data-field="${f}"
								value="${esc}">
						</div>
					</td>`;
				}
			});

			html += `</tr>`;
		});

		html += `</tbody></table></div>`;

		$('#tracker-board').html(html);
		render_links();
		bind_events();
	}

	// ---------------- RENDER LINK FIELDS ----------------
	function render_links() {
		$('.link-wrap').each(function () {
			let $el      = $(this);
			let doc      = $el.data('doc');
			let field    = $el.data('field');
			let options  = $el.data('options');
			let value    = $el.data('value');

			$el.empty();

			let control = frappe.ui.form.make_control({
				parent: $el,
				df: {
					fieldtype: 'Link',
					fieldname: field,
					options:   options,
					only_select: 1,
					create_new: 0,
					get_query: function () { return {}; },
					change: function () {
						let new_val = control.get_value();
						save(doc, field, new_val, $el);
						// display span update karo
						let $td = $el.closest('td');
						let $disp = $td.find('.cell-display');
						$disp.text(new_val || '—');
						$disp.toggleClass('empty', !new_val);
						// editor band karo
						exit_edit($td);
					}
				},
				render_input: true
			});

			control.set_value(value || '');
			$el.data('control', control);

			$el.find('.link-btn, .btn, .add-btn, .input-group-append').remove();
		});
	}

	// ---------------- EDIT MODE HELPERS ----------------
	function enter_edit($td) {
		$td.addClass('td-editing');
		let type = $td.data('type');
		if (type === 'link') {
			// frappe link input focus
			$td.find('.link-wrap input').first().focus();
		} else if (type === 'select') {
			$td.find('select').focus();
		} else if (type === 'data') {
			let $inp = $td.find('input');
			$inp.focus();
			let v = $inp.val();
			$inp[0].setSelectionRange(v.length, v.length);
		} else if (type === 'text') {
			let $ta = $td.find('textarea');
			$ta.focus();
			let v = $ta.val();
			$ta[0].setSelectionRange(v.length, v.length);
			auto_height($ta[0]);
		}
	}

	function exit_edit($td) {
		$td.removeClass('td-editing');
	}

	// ---------------- SAVE ----------------
	function save(doc, field, value, $el) {
		if ($el) $el.css('opacity', '0.6');
		frappe.call({
			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.update_tracker_field',
			args: { docname: doc, field, value },
			callback: function () {
				if ($el) $el.css('opacity', '1');
			}
		});
	}

	// ---------------- BIND EVENTS ----------------
	function bind_events() {

		// Display span click => enter edit mode
		$(document).on('click', '.cell-display', function () {
			let $td = $(this).closest('td');
			enter_edit($td);
		});

		// Select change => save + exit
		$('.cell-sel-input').on('change', function () {
			let $el  = $(this);
			let $td  = $el.closest('td');
			let val  = $el.val();
			save($el.data('doc'), $el.data('field'), val, $el);
			// display update
			let $disp = $td.find('.cell-display');
			$disp.text(val || '—');
			$disp.toggleClass('empty', !val);
			exit_edit($td);
		});

		// Data input — blur pe save + exit
		$('.cell-data-input').on('blur', function () {
			let $el  = $(this);
			let $td  = $el.closest('td');
			let val  = $el.val();
			save($el.data('doc'), $el.data('field'), val, $el);
			// display update
			let $disp = $td.find('.cell-display');
			$disp.text(val || '—');
			$disp.toggleClass('empty', !val);
			exit_edit($td);
		});

		// Data input — Enter pe blur
		$('.cell-data-input').on('keydown', function (e) {
			if (e.key === 'Enter') $(this).blur();
			if (e.key === 'Escape') {
				exit_edit($(this).closest('td'));
			}
		});

		// Link blur — exit (save link ke change event mein hota hai)
		$(document).on('blur', '.link-wrap input', function () {
			let $td = $(this).closest('td');
			// thoda delay — agar autocomplete select hua to pehle change fire ho
			setTimeout(() => exit_edit($td), 200);
		});

		// Escape key pe bhi exit
		$(document).on('keydown', '.td-editing input, .td-editing select', function (e) {
			if (e.key === 'Escape') exit_edit($(this).closest('td'));
		});

		// Textarea — blur pe save
		$('.cell-textarea').on('blur', function () {
			let $el = $(this);
			let $td = $el.closest('td');
			let val = $el.val();
			save($el.data('doc'), $el.data('field'), val, $el);
			// display update
			let $disp = $td.find('.cell-display');
			$disp.text(val || '—');
			$disp.toggleClass('empty', !val);
			exit_edit($td);
		});

		// Textarea auto height
		$('.cell-textarea').each(function () {
			auto_height(this);
		}).on('input', function () {
			auto_height(this);
		});
	}

	function auto_height(el) {
		el.style.height = 'auto';
		el.style.height = Math.max(24, el.scrollHeight) + 'px';
	}

	page.set_primary_action(__('Refresh'), refresh_data);
page.add_button(__('Applicant Tracker'), function () {
	frappe.new_doc('Applicant Tracker');
});
	refresh_data();
};

// frappe.pages['applicant-tracker-report'].on_page_load = function (wrapper) {

// 	var page = frappe.ui.make_app_page({
// 		parent: wrapper,
// 		title: __('Applicant Tracker Report'),
// 		single_column: true
// 	});

// 	page.main.append(`
// 		<div class="container-fluid" style="padding:15px;">
// 			<div class="card shadow-sm">
// 				<div class="card-body p-0">
// 					<div id="tracker-board"></div>
// 				</div>
// 			</div>
// 		</div>
// 	`);

// 	// ---------------- FILTERS ----------------
// 	let f_applicant = page.add_field({ fieldtype: 'Link', fieldname: 'job_applicant', options: 'Job Applicant', label: 'Job Applicant', only_select: true, change: refresh_data });
// 	let f_opening = page.add_field({ fieldtype: 'Link', fieldname: 'job_opening', options: 'Job Opening', label: 'Job Opening', only_select: true, change: refresh_data });
// 	let f_role = page.add_field({fieldtype: 'Data',fieldname: 'role',label: 'Role',change: refresh_data});
// 	let f_recommendation = page.add_field({fieldtype: 'Select',fieldname: 'recommendation',label: 'Recommendation',options:'\nRecommended\nNot Recommended\nRecommended + Expensive',change: refresh_data});
// 	let f_experience = page.add_field({fieldtype: 'Data',fieldname: 'experience',label: 'Experience',change: refresh_data});
// 	let f_final_conclusion = page.add_field({fieldtype: 'Data',fieldname: 'final_conclusion',label: 'Final Conclusion',change: refresh_data});
// 	let f_location = page.add_field({fieldtype: 'Data',fieldname: 'location',label: 'Location',change: refresh_data});
// 	let f_name = page.add_field({ fieldtype: 'Data', fieldname: 'applicant_name', label: 'Applicant Name', change: refresh_data });
// 	let f_source = page.add_field({ fieldtype: 'Data', fieldname: 'job_applicant_source', label: 'Source', change: refresh_data });

// 	let data = [], meta = {}, order = [];

// 	// ---------------- LOAD DATA ----------------
// 	function refresh_data() {
// 		$('#tracker-board').html(`<div class="text-center p-5 text-muted">Loading...</div>`);
// 		frappe.call({
// 			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.get_tracker_data',
// 			args: {
// 				filters: {
// 					job_applicant: f_applicant.get_value(),
// 					job_opening: f_opening.get_value(),
// 					applicant_name: f_name.get_value(),
// 					job_applicant_source: f_source.get_value(),
// 					role: f_role.get_value(),
// 					recommendation: f_recommendation.get_value(),
// 					experience: f_experience.get_value(),
// 					// experience_value: f_experience_value.get_value(),
// 					final_conclusion: f_final_conclusion.get_value(),
// 					location: f_location.get_value()
// 				}
// 			},
// 			callback: function (r) {
// 				if (r.message) {
// 					data = r.message.data || [];
// 					meta = r.message.field_meta || {};
// 					order = r.message.fields_order || [];
// 					render_table();
// 				}
// 			}
// 		});
// 	}

// 	// ---------------- RENDER TABLE ----------------
// 	function render_table() {

// 		let html = `
// 		<style>
// 			/* FIX 1: overflow-x only — vertical scroll nahi, horizontal scroll hai agar columns zyada hon */
// 			.atbl-wrap {
// 				overflow-x: auto;
// 				overflow-y: auto;
// 				max-height: calc(100vh - 160px);  /* 160px = header + filters ki height */
// 				border-radius: 10px;
// 				border: 1px solid #c8d6e5;
// 			}
// 						.atbl {
// 							width: 100%;
// 							border-collapse: collapse;
// 							font-size: 13px;
// 						}
// 			.atbl thead tr {
// 				position: sticky;
// 				top: 0;
// 				z-index: 10;   /* atbl-wrap k andar sticky — bahar nahi jaega */
// 			}
// 				.atbl thead tr {
// 				position: sticky;
// 				top: 0;
// 				z-index: 50;              /* zyada z-index — frappe dropdowns se upar rahe */
// 			}
// 			.atbl thead th {
// 				padding: 11px 14px;
// 				font-size: 11px;
// 				font-weight: 600;
// 				letter-spacing: 0.06em;
// 				text-transform: uppercase;
// 				color: #e8edf2;
// 				background:rgb(24, 126, 139);      /* default — Data fields */
// 				border-right: 1px solidrgb(58, 138, 131);
// 				border-bottom: 2px solidrgb(35, 142, 156);
// 				white-space: nowrap;
// 				position: sticky;
// 				top: 0;
// 			}
// 			/* Link fields — neela */
// 			.atbl thead th.th-link {
// 				background:rgb(63, 170, 138);
// 				border-right-color:rgb(63, 170, 138);
// 			}
// 			/* Select fields — purple */
// 			.atbl thead th.th-select {
// 				background:rgb(39, 173, 91);
// 				border-right-color:rgb(29, 170, 104);
// 			}
// 			/* Date fields — teal */
// 			.atbl thead th.th-date {
// 				background:rgb(67, 136, 113);
// 				border-right-color:rgb(67, 136, 113);
// 			}
// 			/* Text/Textarea fields — dark brown */
// 			.atbl thead th.th-text {
// 				background:rgb(167, 175, 53);
// 				border-right-color: rgb(167, 175, 53);
// 			}
// 			/* ID column — darkest */
// 			.atbl thead th.th-id {
// 				background:rgb(31, 92, 73);
// 				border-right-color: rgb(31, 92, 73);
// 			}
// 			.atbl tbody tr:nth-child(odd)  { background: #f4f7fb; }
// 			.atbl tbody tr:nth-child(even) { background: #eaf0f8; }
// 			.atbl tbody tr:hover {
// 				background: #d6e4f5;
// 				transition: background 0.15s;
// 			}
// 			.atbl tbody td {
// 				padding: 0;
// 				border-right: 1px solid #dce6f0;
// 				border-bottom: 1px solid #dce6f0;
// 				vertical-align: middle;
// 				position: relative;
// 			}
// 			.atbl tbody td:last-child { border-right: none; }

// 			/* --- APPLICANT ID --- */
// 			.atbl td.col-id {
// 				padding: 10px 12px;
// 				white-space: nowrap;
// 				vertical-align: middle;
// 			}
// 			.atbl td.col-id a {
// 				font-family: monospace;
// 				font-size: 12px;
// 				font-weight: 700;
// 				color: #1a5faa;
// 				text-decoration: none;
// 			}
// 			.atbl td.col-id a:hover { color: #0d3f7a; text-decoration: underline; }

// 			/* --- DATE --- */
// 			.atbl td.col-date {
// 				padding: 10px 12px;
// 				white-space: nowrap;
// 				font-size: 12px;
// 				color: #4a6080;
// 				font-weight: 500;
// 				vertical-align: middle;
// 			}

// 			/* --- SHORT INPUT (Data fields) --- */
// 			.direct-input {
// 				display: block;
// 				width: 100%;
// 				height: 100%;
// 				min-height: 42px;
// 				padding: 0 12px;
// 				font-size: 13px;
// 				color: #1e2d3d;
// 				background: transparent;
// 				border: none;
// 				outline: none;
// 				font-family: inherit;
// 				box-sizing: border-box;
// 				line-height: 42px;        /* text vertically center */
// 			}
// 			.direct-input:hover { background: rgba(26,95,170,0.07); }
// 			.direct-input:focus {
// 				background: #fff;
// 				box-shadow: inset 0 0 0 2px #1a5faa;
// 			}

// 			/* --- SELECT --- */
// 			.direct-select {
// 				display: block;
// 				width: 100%;
// 				height: 100%;
// 				min-height: 42px;
// 				padding: 0 12px;
// 				font-size: 13px;
// 				color: #1e2d3d;
// 				background: transparent;
// 				border: none;
// 				outline: none;
// 				font-family: inherit;
// 				box-sizing: border-box;
// 				cursor: pointer;
// 				-webkit-appearance: auto;
// 			}
// 						.direct-select:hover { background: rgba(26,95,170,0.07); }
// 						.direct-select:focus {
// 							background: #fff;
// 							box-shadow: inset 0 0 0 2px #1a5faa;
// 						}

// 						/* FIX 2: Textarea min-height kam ki — row height zyada nahi hogi */
// 			textarea.direct-textarea {
// 				display: block;
// 				width: 100%;
// 				min-height: 42px;
// 				padding: 10px 12px;
// 				font-size: 12px;
// 				line-height: 1.6;
// 				color: #1e2d3d;
// 				background: transparent;
// 				border: none;
// 				outline: none;
// 				font-family: inherit;
// 				box-sizing: border-box;
// 				resize: vertical;
// 				white-space: pre-wrap;
// 				word-wrap: break-word;
// 			}
// 			textarea.direct-textarea:hover { background: rgba(26,95,170,0.07); }
// 			textarea.direct-textarea:focus {
// 				background: #fff;
// 				box-shadow: inset 0 0 0 2px #1a5faa;
// 			}
// 		</style>

// 		<div class="atbl-wrap">
// 		<table class="atbl">
// 			<thead>
// 				<tr>
// 		<th class="th-id" style="min-width:70px">#</th>
// 		<th class="th-id" style="min-width:130px">Applicant ID</th>
// 		${order.map(f => {
// 			let m = meta[f];
// 			let w = '140px';
// 			if (m?.fieldtype === 'Link') w = '170px';
// 			if (m?.fieldtype === 'Select') w = '140px';
// 			if (m?.fieldtype === 'Date') w = '80px';
// 			if (m?.fieldtype === 'Text') w = '550px';
// 			if (m?.fieldtype === 'Long Text') w = '550px';
// 			if (m?.fieldtype === 'Small Text') w = '550px';

// 			// fieldtype ke hisaab se class
// 			let cls = 'th-data';
// 			if (m?.fieldtype === 'Link') cls = 'th-link';
// 			else if (m?.fieldtype === 'Select') cls = 'th-select';
// 			else if (m?.fieldtype === 'Date') cls = 'th-date';
// 			else if (['Text', 'Long Text', 'Small Text'].includes(m?.fieldtype)) cls = 'th-text';

// 			return `<th class="${cls}" style="min-width:${w}">${m?.label || f}</th>`;
// 		}).join('')}
// 				</tr>
// 			</thead>
// 			<tbody>
// 		`;

// 		if (!data.length) {
// 			html += `<tr><td colspan="${order.length + 2}"
// 				style="text-align:center;padding:48px;color:#8aa0ba;font-size:14px;">
// 				No records found
// 			</td></tr>`;
// 		}

		
// 		   data.forEach((row, idx) => {

// 			html += `<tr>

// 				<td class="col-id"
// 					style="text-align:center;font-weight:600;width:70px;">
// 					${idx + 1}
// 				</td>

// 				<td class="col-id">
// 					<a href="/app/applicant-tracker/${row.name}">
// 						${row.name}
// 					</a>
// 				</td>`;
// 			order.forEach(f => {
// 				let m = meta[f];
// 				let val = row[f] || '';

// 				// --- LINK ---
// 				if (m?.fieldtype === 'Link') {
// 					html += `<td style="min-width:170px">
// 						<div class="link-wrap"
// 							data-doc="${row.name}"
// 							data-field="${f}"
// 							data-options="${m.options}"
// 							data-value="${val}">
// 						</div>
// 					</td>`;
// 				}

// 				// --- SELECT ---
// 				else if (m?.fieldtype === 'Select') {
// 					html += `<td style="min-width:140px">
// 						<select class="direct-select cell-input"
// 							data-doc="${row.name}"
// 							data-field="${f}">
// 							<option value=""></option>
// 							${(m.options || '').split('\n').map(o =>
// 						o ? `<option value="${o}" ${o == val ? 'selected' : ''}>${o}</option>` : ''
// 					).join('')}
// 						</select>
// 					</td>`;
// 				}

// 				// --- DATE ---
// 				else if (m?.fieldtype === 'Date') {
// 					html += `<td class="col-date" style="min-width:120px">${val}</td>`;
// 				}

// 				// --- LONG TEXT / TEXT / SMALL TEXT ---
// 				else if (
// 					m?.fieldtype === 'Text' ||
// 					m?.fieldtype === 'Long Text' ||
// 					m?.fieldtype === 'Small Text'
// 				) {
// 					let minW = m?.fieldtype === 'Long Text' ? '260px'
// 						: m?.fieldtype === 'Text' ? '240px'
// 							: '220px';
// 					html += `<td style="min-width:${minW}; padding:0;">
// 						<textarea
// 							class="direct-textarea cell-textarea"
// 							data-doc="${row.name}"
// 							data-field="${f}"
// 						>${frappe.utils.escape_html(val)}</textarea>
// 					</td>`;
// 				}

// 				// --- SHORT DATA ---
// 				else {
// 					html += `<td style="min-width:140px">
// 						<input
// 							class="direct-input cell-input"
// 							data-doc="${row.name}"
// 							data-field="${f}"
// 							value="${frappe.utils.escape_html(val)}">
// 					</td>`;
// 				}
// 			});

// 			html += `</tr>`;
// 		});

// 		html += `</tbody></table></div>`;

// 		$('#tracker-board').html(html);
// 		render_links();
// 		bind_events();
// 	}

// 	// ---------------- RENDER LINK FIELDS ----------------
// 	function render_links() {
// 		$('.link-wrap').each(function () {
// 			let $el = $(this);
// 			let doc = $el.data('doc');
// 			let field = $el.data('field');
// 			let options = $el.data('options');
// 			let value = $el.data('value');

// 			$el.empty();

// 			let control = frappe.ui.form.make_control({
// 				parent: $el,
// 				df: {
// 					fieldtype: 'Link',
// 					fieldname: field,
// 					options: options,
// 					only_select: 1,
// 					create_new: 0,
// 					get_query: function () { return {}; },
// 					change: function () {
// 						save(doc, field, control.get_value(), $el);
// 					}
// 				},
// 				render_input: true
// 			});

// 			control.set_value(value || '');

// 			$el.find('input')
// 				.addClass('direct-input')
// 				.css({
// 					border: 'none',
// 					boxShadow: 'none',
// 					background: 'transparent',
// 					borderRadius: '0',
// 					height: '42px',
// 					lineHeight: '42px',
// 					padding: '0 12px'
// 				});
// 			$el.find('.link-btn, .btn, .add-btn, .input-group-append').remove();
// 		});
// 	}

// 	// ---------------- SAVE ----------------
// 	function save(doc, field, value, $el) {
// 		if ($el) $el.css('opacity', '0.6');
// 		frappe.call({
// 			method: 'techner.techner.page.applicant_tracker_report.applicant_tracker_report.update_tracker_field',
// 			args: { docname: doc, field, value },
// 			callback: function () {
// 				if ($el) $el.css('opacity', '1');
// 			}
// 		});
// 	}


// 	function bind_events() {

// 		// Input aur Select — change pe save
// 		$('.cell-input').on('change', function () {
// 			let $el = $(this);
// 			save($el.data('doc'), $el.data('field'), $el.val(), $el);
// 		});

// 		// Textarea — blur pe save
// 		$('.cell-textarea').on('blur', function () {
// 			let $el = $(this);
// 			save($el.data('doc'), $el.data('field'), $el.val(), $el);
// 		});

// 		// Textarea auto height
// 		$('.cell-textarea').each(function () {
// 			auto_height(this);
// 		}).on('input', function () {
// 			auto_height(this);
// 		});

// 		// ✅ POORA CELL CLICK KARO — input/select/textarea focus ho jaye
// 		$('.atbl tbody td').on('click', function (e) {
// 			// Agar already input/select/textarea pe click hua toh skip
// 			if ($(e.target).is('input, select, textarea, a')) return;

// 			// td ke andar jo bhi input/select/textarea ho usse focus karo
// 			let $input = $(this).find('input, select, textarea').first();
// 			if ($input.length) {
// 				$input.focus();
// 				// Input ke liye cursor end mein le jao
// 				if ($input.is('input') || $input.is('textarea')) {
// 					let val = $input.val();
// 					$input[0].setSelectionRange(val.length, val.length);
// 				}
// 			}
// 		});
// 	}
// 	function auto_height(el) {
// 		el.style.height = 'auto';
// 		el.style.height = Math.max(42, el.scrollHeight) + 'px';
// 	}

// 	page.set_primary_action(__('Refresh'), refresh_data);
// 	refresh_data();
// };