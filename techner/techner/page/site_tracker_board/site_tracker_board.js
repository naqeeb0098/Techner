frappe.pages['site-tracker-board'].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Site Projects Dashboard',
		single_column: true
	});

	// Setup Filters
	let project_filter = page.add_field({ fieldtype: 'Link', fieldname: 'project', options: 'Site Projects', label: 'Project', change: function () { render_board(); } });
	let site_filter = page.add_field({ fieldtype: 'Link', fieldname: 'site', options: 'Site', label: 'Site', change: function () { render_board(); } });
	let user_filter = page.add_field({ fieldtype: 'Link', fieldname: 'assign_to', options: 'User', label: 'Assign To', change: function () { render_board(); } });
	let status_filter = page.add_field({fieldtype: 'Select',fieldname: 'status',label: 'Status',options: '\nPending\nPartial\nCompleted',change: function () {render_board();}});
	let remarks_filter = page.add_field({fieldtype: 'Data',fieldname: 'remarks',label: 'Remarks',change: frappe.utils.debounce(function () {render_board();}, 500)});

	page.main.append('<div id="stats-container" style="padding: 10px 15px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 15px;">' +
		'<div class="stats-card" style="background: #fff; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; min-width: 120px;">' +
			'<span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 600;">Total Sites</span>' +
			'<span id="total-sites-count" style="font-size: 24px; font-weight: 700; color: #0f172a;">0</span>' +
		'</div>' +
	'</div>');

	page.main.append('<div id="board-container" style="overflow-x: auto; max-height: 80vh; padding: 15px; margin-top: 10px;"></div>');

	let app_users = [];
	let app_statuses = ['Partial', 'Completed', 'Pending'];

	const MILESTONE_COLORS = [
		{ bg: '#00A8CC', text: '#fff' }, // Cyan
		{ bg: '#FFB800', text: '#000' }, // Yellow
		{ bg: '#0070F3', text: '#fff' }, // Blue
		{ bg: '#9C27B0', text: '#fff' }, // Purple
		{ bg: '#FF5722', text: '#fff' }, // Orange
		{ bg: '#607D8B', text: '#fff' }  // Grey
	];

	// Status → border/badge color
	const STATUS_COLORS = {
		'Pending':   '#ef4444',  // Red
		'Completed': '#22c55e',  // Green
		'Partial':   '#fb923c'   // Orange
	};

	function get_status_color(status) {
		return STATUS_COLORS[status] || '#e2e8f0';
	}

	/**
	 * Determine TD background color based on date logic:
	 *  - Actual empty  + Forecast in future              → Blue   (#bfdbfe)
	 *  - Actual empty  + Forecast in past                → Red    (#fee2e2)
	 *  - Actual filled + Forecast in future OR equal     → Green  (#dcfce7)
	 *  - Actual filled + Actual AFTER forecast           → Pink   (#fce7f3)
	 *  - Actual filled + Forecast empty                  → Yellow (#fef08a)
	 */
	function get_date_row_color(actual, forecast) {
		if (!actual && !forecast) return '';   // Both empty — no color
		const today = frappe.datetime.get_today(); // 'YYYY-MM-DD'

		const fDate = forecast || null;
		const aDate = actual   || null;

		if (!aDate && fDate) {
			if (fDate >= today) return '#bfdbfe';   // Forecast in future & no actual → Blue
			return '#fee2e2';                        // Past forecast & no actual → Red
		}

		if (aDate) {
			if (!fDate) return '#fef08a';            // Actual filled, no forecast → Yellow
			if (aDate > fDate) return '#fce7f3';     // Actual after forecast → Light Pink
			return '#dcfce7';                        // Actual ≤ forecast → Green
		}

		return '';
	}

	function get_iso_week_number(date_str) {
		if (!date_str) return '';
		const date = new Date(date_str);
		if (isNaN(date.getTime())) return '';
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
		const week1 = new Date(date.getFullYear(), 0, 4);
		return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
	}

	function get_filters() {
		return {
			project: project_filter.get_value(),
			site: site_filter.get_value(),
			assign_to: user_filter.get_value(),
			status: status_filter.get_value(),
			remarks: remarks_filter.get_value()
		};
	}

	function render_board() {
		page.main.find('#board-container').html('<div class="text-muted"><i class="fa fa-spinner fa-spin"></i> Loading data...</div>');

		frappe.call({
			method: 'techner.techner.page.site_tracker_board.site_tracker_board.get_board_data',
			args: { filters: JSON.stringify(get_filters()) },
			callback: function (r) {
				if (r.message) {
					app_users = r.message.users || [];
					draw_table(r.message.data, r.message.milestones);
					$('#total-sites-count').text(r.message.data.length);
				}
			}
		});
	}

	function draw_table(data, milestones) {
		let html = '<style>';
		html += '#tracker-board-table { border-collapse: collapse; width: 100%; font-size: 12px; font-family: "Inter", sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }';
		html += '#tracker-board-table th { border: 1px solid #e2e8f0; padding: 4px 6px; text-align: center; vertical-align: middle; white-space: normal; line-height: 1.2; }';
		html += '#tracker-board-table td { border: 1px solid #e2e8f0; padding: 3px 4px; text-align: left; vertical-align: middle; height: 30px; }';
		html += '#tracker-board-table thead th { position: sticky; top: 0; z-index: 2; font-weight: 600; }';
		html += '#tracker-board-table thead tr:nth-child(1) th { height: 40px; }';
		html += '#tracker-board-table thead tr:nth-child(2) th { top: 40px; }';
		html += '.ms-header { font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }';
		html += '.board-input { border: 1px solid transparent; width: 100%; min-width: 70px; padding: 2px; box-sizing: border-box; background: transparent; border-radius: 3px; font-size: 12px; transition: border 0.2s; }';
		html += '.board-input:hover { border-color: #cbd5e1; }';
		html += '.board-input:focus { border: 1px solid #3b82f6; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }';
		html += '.link-col { min-width: 120px; font-weight: 500; }';
		html += 'a.doc-link { color: #1d4ed8; text-decoration: none; font-weight: 600; } a.doc-link:hover { text-decoration: underline; }';
		html += '.status-select { min-width: 90px; }';
		html += '.date-input { min-width: 100px; }';
		html += 'tbody tr:hover td { background-color: #f8fafc; }';
		html += 'tbody td { background-color: #ffffff; }';

		// Assign-to search wrapper
		html += '.assign-wrapper { position: relative; display: flex; justify-content: center; align-items: center; }';
		html += '.assign-trigger { cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; transition: background 0.2s; }';
		html += '.assign-trigger:hover { filter: brightness(0.9); }';
		html += '.assign-dropdown { display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; z-index: 999; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }';
		html += '.assign-options-list { max-height: 150px; overflow-y: auto; }';
		html += '.assign-dropdown .assign-opt { padding: 6px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }';
		html += '.assign-dropdown .assign-opt:hover { background: #eff6ff; color: #1d4ed8; }';
		html += '.assign-dropdown .assign-opt.no-result { color: #94a3b8; cursor: default; }';
		html += '</style>';

		html += '<table id="tracker-board-table">';

		// Top header
		html += '<thead><tr>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:50px; text-align:center;">Sr.</th>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Project</th>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Site Name</th>';

		milestones.forEach((m, idx) => {
			let c = MILESTONE_COLORS[idx % MILESTONE_COLORS.length];
			html += `<th colspan="8" class="ms-header" style="background-color:${c.bg}; color:${c.text};">${m}</th>`;
		});
		html += '</tr><tr>';

		milestones.forEach(() => {
				['WK#', 'Assign To', 'Status', 'Submission Forecast Date', 'Submission Actual Date', 'Approval Forecast Date', 'Approval Actual Date', 'Remarks'].forEach(col => {
				html += `<th style="background-color:#f0f4f8; font-size:11px; font-weight:600; color:#475569; text-align:center; text-transform:uppercase; letter-spacing:0.4px;">${col}</th>`;
			});
		});
		html += '</tr></thead>';

		// Body
		html += '<tbody>';
		if (data.length === 0) {
			html += `<tr><td colspan="${3 + (milestones.length * 8)}" class="text-center text-muted" style="padding:20px;">No records found.</td></tr>`;
		}

		let index = 1;
		data.forEach(row => {
			html += '<tr>';

			html += `<td style="text-align:center; font-weight:600; color:#64748b; background-color:#f8fafc;">${index++}</td>`;

			let p_link = `<a href="/app/site-projects/${row.project}" class="doc-link">${row.project}</a>`;
			let s_link = `<a href="/app/site/${row.site}" class="doc-link">${row.site_name || row.site || ''}</a>`;

			html += `<td class="link-col">${p_link}</td>`;
			html += `<td class="link-col">${s_link}</td>`;

			milestones.forEach((m) => {
				let m_data = row.milestones[m] || {};
				let row_name = m_data.name || '';
				let site_tracker = row.site_tracker || '';

				let data_attrs = `data-tracker="${site_tracker}" data-rowname="${row_name}"`;

				if (!site_tracker || !row_name) {
					// No tracker — show dashes for all cols
					for (let i = 0; i < 8; i++) {
						html += `<td><span class="text-muted" style="opacity:0.3;">-</span></td>`;
					}
					return;
				}

				let actual_val   = m_data.actual   || '';
				let wk_num = get_iso_week_number(actual_val);

				// --- WK# ---
				html += `<td style="text-align:center; background-color:#f8fafc; font-weight:500; color:#475569;"><span class="wk-num" data-tracker="${site_tracker}" data-rowname="${row_name}">${wk_num}</span></td>`;

				// --- Assign To (avatar/dropdown) ---
				let assign_val = m_data.assign_to || '';
				let assign_display = assign_val; // show email / name
				let found_user = app_users.find(u => u.name === assign_val);
				if (found_user) assign_display = found_user.full_name || found_user.name;

				let avatar_html = '';
				if (assign_val) {
					let parts = assign_display.split(' ');
					let initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
					avatar_html = `<div class="assign-trigger" style="background: #0070F3; color: #fff; font-size: 11px; font-weight: 600;" title="${assign_display}">${initials}</div>`;
				} else {
					avatar_html = `<div class="assign-trigger" style="background: #e2e8f0; color: #64748b; font-size: 14px;" title="Assign User">+</div>`;
				}

				html += `<td>
					<div class="assign-wrapper" data-tracker="${site_tracker}" data-rowname="${row_name}">
						${avatar_html}
						<div class="assign-dropdown">
							<div style="padding: 5px; border-bottom: 1px solid #e2e8f0;">
								<input type="text" class="assign-search-input" placeholder="Search user..." style="width:100%; border:1px solid #cbd5e1; padding:3px 6px; border-radius:3px; font-size:12px;">
							</div>
							<div class="assign-options-list"></div>
						</div>
					</div>
				</td>`;

				// --- Status column ---
				let status_val = m_data.status || '';
				let border_color = get_status_color(status_val);
				let status_html = `<select class="board-input status-select" data-field="status" ${data_attrs}>`;
				status_html += `<option value=""></option>`;
				app_statuses.forEach(s => {
					let sel = status_val === s ? 'selected' : '';
					status_html += `<option value="${s}" ${sel}>${s}</option>`;
				});
				status_html += `</select>`;
				html += `<td style="border-left:3px solid ${border_color};">${status_html}</td>`;

				// --- Forecast date column ---
				let forecast_val = m_data.forcast || '';
				let app_forecast_val = m_data.approval_forcast_date || '';
				let app_actual_val = m_data.approval_actual_date || '';
				
				let date_bg = get_date_row_color(actual_val, forecast_val);
				let forecast_style = date_bg ? `style="background:${date_bg};"` : '';
				
				let f_type = forecast_val ? 'date' : 'text';
				let a_type = actual_val ? 'date' : 'text';
				let af_type = app_forecast_val ? 'date' : 'text';
				let aa_type = app_actual_val ? 'date' : 'text';

				html += `<td ${forecast_style}><input type="${f_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="forcast" ${data_attrs} value="${forecast_val}" placeholder=""></td>`;

				html += `<td ${forecast_style}><input type="${a_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="actual" ${data_attrs} value="${actual_val}" placeholder=""></td>`;

				html += `<td><input type="${af_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="approval_forcast_date" ${data_attrs} value="${app_forecast_val}" placeholder=""></td>`;

				html += `<td><input type="${aa_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="approval_actual_date" ${data_attrs} value="${app_actual_val}" placeholder=""></td>`;

				// --- Remarks ---
				html += `<td><textarea class="board-input remarks-input" data-field="remarks" ${data_attrs} style="resize:none; height:24px; min-width:150px; white-space:normal; overflow:hidden;">${m_data.remarks || ''}</textarea></td>`;
			});

			html += '</tr>';
		});
		html += '</tbody></table>';

		page.main.find('#board-container').html(html);

		bind_events();
	}

	function save_field(tracker, rowname, field, value, $el) {
		if (!tracker || !rowname) return;

		$el.css('opacity', '0.5'); // saving indicator

		frappe.call({
			method: 'techner.techner.page.site_tracker_board.site_tracker_board.update_milestone_field',
			args: {
				site_tracker: tracker,
				milestone_row_name: rowname,
				field: field,
				value: value
			},
			callback: function (r) {
				if (!r.exc) {
					$el.css('opacity', '1');
					if (field === 'status') {
						$el.closest('td').css('border-left', '3px solid ' + get_status_color(value));
					}
					if (field === 'forcast' || field === 'actual') {
						// Re-compute date color for both date cells in same milestone
						let $row = $el.closest('tr');
						let tracker_id = $el.data('tracker');
						let rowname_id = $el.data('rowname');
						// Find the sibling date cell
						let $forecast_input = $row.find(`input[data-field="forcast"][data-tracker="${tracker_id}"][data-rowname="${rowname_id}"]`);
						let $actual_input   = $row.find(`input[data-field="actual"][data-tracker="${tracker_id}"][data-rowname="${rowname_id}"]`);
						let fv = $forecast_input.val();
						let av = $actual_input.val();
						let bg = get_date_row_color(av, fv);
						let css_bg = bg || '';
						$forecast_input.closest('td').css('background', css_bg);
						$actual_input.closest('td').css('background', css_bg);
						
						if (field === 'actual') {
							let wk_val = get_iso_week_number(av);
							$row.find(`.wk-num[data-tracker="${tracker_id}"][data-rowname="${rowname_id}"]`).text(wk_val);
						}
					}
				} else {
					$el.css('opacity', '1').css('border-color', 'red');
					setTimeout(() => $el.css('border-color', ''), 2000);
				}
			}
		});
	}

	function bind_events() {
		let $container = page.main.find('#board-container');

		// Standard inputs (text, date, status select)
		$container.find('.board-input:not(.assign-search)').on('change', function () {
			let $input = $(this);
			save_field(
				$input.data('tracker'),
				$input.data('rowname'),
				$input.data('field'),
				$input.val(),
				$input
			);
		});

		// Auto-resize remarks textarea
		$container.on('input', '.remarks-input', function () {
			this.style.height = 'auto';
			this.style.height = (this.scrollHeight) + 'px';
		});

		// Click on avatar to toggle dropdown
		$container.on('click', '.assign-trigger', function (e) {
			e.stopPropagation();
			let $trigger = $(this);
			let $dd = $trigger.siblings('.assign-dropdown');
			
			// Close all other dropdowns
			$('.assign-dropdown').not($dd).hide();
			
			$dd.toggle();
			if ($dd.is(':visible')) {
				$dd.find('.assign-search-input').focus();
				// Render all users initially
				let $list = $dd.find('.assign-options-list');
				render_assign_dropdown_list($list, app_users);
			}
		});

		// Search input inside dropdown
		$container.on('input', '.assign-search-input', function () {
			let $inp = $(this);
			let query = $inp.val().toLowerCase().trim();
			let $list = $inp.closest('.assign-dropdown').find('.assign-options-list');

			let filtered = app_users.filter(u => {
				let label = (u.full_name || u.name).toLowerCase();
				return !query || label.includes(query) || u.name.toLowerCase().includes(query);
			});

			render_assign_dropdown_list($list, filtered);
		});

		// Click on an option
		$container.on('click', '.assign-opt', function () {
			let $opt = $(this);
			if ($opt.hasClass('no-result')) return;

			let val        = $opt.data('value');
			let label      = $opt.data('label');
			let $dd        = $opt.closest('.assign-dropdown');
			let $wrapper   = $opt.closest('.assign-wrapper');

			$dd.hide();

			// Update avatar
			let $trigger = $wrapper.find('.assign-trigger');
			if (val) {
				let parts = label.split(' ');
				let initials = parts.map(p => p[0]).join('').substring(0, 2).toUpperCase();
				$trigger.css('background', '#0070F3').css('color', '#fff').text(initials).attr('title', label);
			} else {
				$trigger.css('background', '#e2e8f0').css('color', '#64748b').text('+').attr('title', 'Assign User');
			}

			save_field(
				$wrapper.data('tracker'),
				$wrapper.data('rowname'),
				'assign_to',
				val,
				$trigger
			);
		});

		// Hide dropdown on outside click
		$(document).on('click.assign_dd', function (e) {
			if (!$(e.target).closest('.assign-wrapper').length) {
				$container.find('.assign-dropdown').hide();
			}
		});
	}

	function render_assign_dropdown_list($list, users) {
		$list.empty();
		if (!users.length) {
			$list.append('<div class="assign-opt no-result">No users found</div>');
			return;
		}
		// Add blank/clear option
		$list.append(`<div class="assign-opt" data-value="" data-label=""><em style="color:#94a3b8;">— Clear —</em></div>`);
		users.forEach(u => {
			let label = u.full_name ? `${u.full_name} <small style="color:#94a3b8;">(${u.name})</small>` : u.name;
			let plain_label = u.full_name || u.name;
			$list.append(`<div class="assign-opt" data-value="${u.name}" data-label="${plain_label}">${label}</div>`);
		});
	}

	page.set_primary_action('Refresh', render_board, 'refresh');

	render_board();
}
