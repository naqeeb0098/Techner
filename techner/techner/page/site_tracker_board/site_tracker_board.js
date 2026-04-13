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

	page.main.append('<div id="board-container" style="overflow-x: auto; max-height: 80vh; padding: 15px; margin-top: 10px;"></div>');

	let app_users = [];
	let app_statuses = ['Open', 'Complete'];

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
		'Open':     '#ef4444',  // Red
		'Complete': '#22c55e'   // Green
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

	function get_filters() {
		return {
			project: project_filter.get_value(),
			site: site_filter.get_value(),
			assign_to: user_filter.get_value()
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
				}
			}
		});
	}

	function draw_table(data, milestones) {
		let html = '<style>';
		html += '#tracker-board-table { border-collapse: collapse; width: 100%; font-size: 13px; font-family: "Inter", sans-serif; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }';
		html += '#tracker-board-table th, #tracker-board-table td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: middle; white-space: nowrap; height: 35px; }';
		html += '#tracker-board-table thead th { position: sticky; top: 0; z-index: 2; font-weight: 600; }';
		html += '#tracker-board-table thead tr:nth-child(2) th { top: 35px; }';
		html += '.ms-header { text-align: center !important; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }';
		html += '.board-input { border: 1px solid transparent; width: 100%; min-width: 90px; padding: 4px; box-sizing: border-box; background: transparent; border-radius: 3px; font-size: 12px; transition: border 0.2s; }';
		html += '.board-input:hover { border-color: #cbd5e1; }';
		html += '.board-input:focus { border: 1px solid #3b82f6; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }';
		html += '.link-col { min-width: 150px; font-weight: 500; }';
		html += 'a.doc-link { color: #1d4ed8; text-decoration: none; font-weight: 600; } a.doc-link:hover { text-decoration: underline; }';
		html += '.status-select { min-width: 110px; }';
		html += '.date-input { min-width: 120px; }';
		html += 'tbody tr:hover td { background-color: #f8fafc; }';
		html += 'tbody td { background-color: #ffffff; }';

		// Assign-to search wrapper
		html += '.assign-wrapper { position: relative; min-width: 150px; }';
		html += '.assign-search { width: 100%; border: 1px solid transparent; padding: 3px 6px; border-radius: 3px; font-size: 12px; background: transparent; box-sizing: border-box; cursor: pointer; }';
		html += '.assign-search:hover { border-color: #cbd5e1; }';
		html += '.assign-search:focus { border: 1px solid #3b82f6; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }';
		html += '.assign-dropdown { display: none; position: absolute; top: 100%; left: 0; min-width: 200px; max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 4px; z-index: 999; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }';
		html += '.assign-dropdown .assign-opt { padding: 6px 10px; font-size: 12px; cursor: pointer; white-space: nowrap; }';
		html += '.assign-dropdown .assign-opt:hover { background: #eff6ff; color: #1d4ed8; }';
		html += '.assign-dropdown .assign-opt.no-result { color: #94a3b8; cursor: default; }';
		html += '</style>';

		html += '<table id="tracker-board-table">';

		// Top header
		html += '<thead><tr>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Project</th>';
		html += '<th rowspan="2" style="background-color:#f1f5f9; min-width:180px;">Site Name</th>';

		milestones.forEach((m, idx) => {
			let c = MILESTONE_COLORS[idx % MILESTONE_COLORS.length];
			html += `<th colspan="5" class="ms-header" style="background-color:${c.bg}; color:${c.text};">${m}</th>`;
		});
		html += '</tr><tr>';

		milestones.forEach(() => {
			['Status', 'Forecast', 'Actual', 'Remarks', 'Assign To'].forEach(col => {
				html += `<th style="background-color:#f0f4f8; font-size:11px; font-weight:600; color:#475569; text-align:center; text-transform:uppercase; letter-spacing:0.4px;">${col}</th>`;
			});
		});
		html += '</tr></thead>';

		// Body
		html += '<tbody>';
		if (data.length === 0) {
			html += `<tr><td colspan="${2 + (milestones.length * 5)}" class="text-center text-muted" style="padding:20px;">No records found.</td></tr>`;
		}

		data.forEach(row => {
			html += '<tr>';

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
					// No tracker — show dashes for all 5 cols
					for (let i = 0; i < 5; i++) {
						html += `<td><span class="text-muted" style="opacity:0.3;">-</span></td>`;
					}
					return;
				}

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
				let actual_val   = m_data.actual   || '';
				let date_bg = get_date_row_color(actual_val, forecast_val);
				let forecast_style = date_bg ? `style="background:${date_bg};"` : '';
				
				let f_type = forecast_val ? 'date' : 'text';
				let a_type = actual_val ? 'date' : 'text';

				html += `<td ${forecast_style}><input type="${f_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="forcast" ${data_attrs} value="${forecast_val}" placeholder=""></td>`;

				// --- Actual date column ---
				html += `<td ${forecast_style}><input type="${a_type}" onfocus="(this.type='date')" onblur="(this.type=this.value?'date':'text')" class="board-input date-input" data-field="actual" ${data_attrs} value="${actual_val}" placeholder=""></td>`;

				// --- Remarks ---
				html += `<td><input type="text" class="board-input" data-field="remarks" ${data_attrs} value="${m_data.remarks || ''}"></td>`;

				// --- Assign To (searchable) ---
				let assign_val = m_data.assign_to || '';
				let assign_display = assign_val; // show email / name
				// Try to find full_name from users list
				let found_user = app_users.find(u => u.name === assign_val);
				if (found_user) assign_display = found_user.full_name || found_user.name;

				html += `<td>
					<div class="assign-wrapper" data-tracker="${site_tracker}" data-rowname="${row_name}">
						<input type="text"
							class="assign-search board-input"
							data-field="assign_to"
							data-tracker="${site_tracker}"
							data-rowname="${row_name}"
							data-value="${assign_val}"
							value="${assign_display}"
							placeholder="Search user..."
							autocomplete="off">
						<div class="assign-dropdown"></div>
					</div>
				</td>`;
			});

			html += '</tr>';
		});
		html += '</tbody></table>';

		page.main.find('#board-container').html(html);

		bind_events();
	}

	function save_field(tracker, rowname, field, value, $el) {
		if (!tracker || !rowname) return;

		$el.css('background-color', '#fff3cd'); // saving indicator

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
					$el.css('background-color', '#d1fae5');
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
					}
					setTimeout(() => $el.css('background-color', ''), 2000);
				} else {
					$el.css('background-color', '#fee2e2');
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

		// ── Assign-To searchable dropdown ─────────────────────────────────────
		$container.on('input', '.assign-search', function () {
			let $inp = $(this);
			let query = $inp.val().toLowerCase().trim();
			let $dd = $inp.siblings('.assign-dropdown');

			let filtered = app_users.filter(u => {
				let label = (u.full_name || u.name).toLowerCase();
				return !query || label.includes(query) || u.name.toLowerCase().includes(query);
			});

			render_assign_dropdown($dd, filtered, $inp);
			$dd.show();
		});

		$container.on('focus', '.assign-search', function () {
			let $inp = $(this);
			let $dd = $inp.siblings('.assign-dropdown');
			render_assign_dropdown($dd, app_users, $inp);
			$dd.show();
		});

		// Click on an option
		$container.on('click', '.assign-opt', function () {
			let $opt = $(this);
			if ($opt.hasClass('no-result')) return;

			let val        = $opt.data('value');
			let label      = $opt.data('label');
			let $dd        = $opt.closest('.assign-dropdown');
			let $inp       = $dd.siblings('.assign-search');

			$inp.val(label);
			$inp.data('value', val);
			$dd.hide();

			save_field(
				$inp.data('tracker'),
				$inp.data('rowname'),
				'assign_to',
				val,
				$inp
			);
		});

		// Hide dropdown on outside click
		$(document).on('click.assign_dd', function (e) {
			if (!$(e.target).closest('.assign-wrapper').length) {
				$container.find('.assign-dropdown').hide();
			}
		});

		// Keyboard ESC to close
		$container.on('keydown', '.assign-search', function (e) {
			if (e.key === 'Escape') {
				$(this).siblings('.assign-dropdown').hide();
				$(this).blur();
			}
		});
	}

	function render_assign_dropdown($dd, users, $inp) {
		$dd.empty();
		if (!users.length) {
			$dd.append('<div class="assign-opt no-result">No users found</div>');
			return;
		}
		// Add blank/clear option
		$dd.append(`<div class="assign-opt" data-value="" data-label=""><em style="color:#94a3b8;">— Clear —</em></div>`);
		users.forEach(u => {
			let label = u.full_name ? `${u.full_name} <small style="color:#94a3b8;">(${u.name})</small>` : u.name;
			let plain_label = u.full_name || u.name;
			$dd.append(`<div class="assign-opt" data-value="${u.name}" data-label="${plain_label}">${label}</div>`);
		});
	}

	page.set_primary_action('Refresh', render_board, 'refresh');

	render_board();
}