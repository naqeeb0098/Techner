frappe.ui.form.on('Leave Application', {
	refresh: function (frm) {
		setTimeout(() => {
			$('.custom-lm-notification').remove();
			if (frm.is_new()) return;

			let workflow_state = (frm.doc.workflow_state || '').toLowerCase();
			let status = (frm.doc.status || '').toLowerCase();

			// --- Approved state: show green success banner ---
			if (workflow_state.includes('approv') || status === 'open' && frm.doc.docstatus === 1) {
				let html = `
					<div class="custom-lm-notification" style="
						display:flex; align-items:flex-start; gap:16px;
						background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
						border:1px solid #bbf7d0; border-left:5px solid #22c55e;
						border-radius:12px; padding:18px 22px; margin: 0 0 18px 0;
						box-shadow: 0 4px 20px -4px rgba(34,197,94,0.15);
						animation: lm_notify_in 0.35s cubic-bezier(.22,.68,0,1.2);
					">
						<div style="flex-shrink:0;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#dcfce7,#bbf7d0);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px rgba(187,247,208,0.5);">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="9 12 11 14 15 10"></polyline>
							</svg>
						</div>
						<div>
							<div style="font-weight:800;font-size:14px;color:#15803d;margin-bottom:5px;">✅ Leave Approved</div>
							<div style="font-size:13px;color:#334155;line-height:1.6;">This leave application has been <strong>approved</strong>. No further actions are required.</div>
						</div>
					</div>`;
				$(html + style_tag()).prependTo(frm.page.wrapper.find('.page-body'));
				return;
			}

			// --- Rejected state: show red banner ---
			if (workflow_state.includes('reject') || status === 'rejected') {
				let html = `
					<div class="custom-lm-notification" style="
						display:flex; align-items:flex-start; gap:16px;
						background: linear-gradient(135deg, #fff1f2 0%, #ffffff 100%);
						border:1px solid #fecdd3; border-left:5px solid #ef4444;
						border-radius:12px; padding:18px 22px; margin: 0 0 18px 0;
						box-shadow: 0 4px 20px -4px rgba(239,68,68,0.15);
						animation: lm_notify_in 0.35s cubic-bezier(.22,.68,0,1.2);
					">
						<div style="flex-shrink:0;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#fee2e2,#fecdd3);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px rgba(254,205,211,0.5);">
							<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<line x1="15" y1="9" x2="9" y2="15"></line>
								<line x1="9" y1="9" x2="15" y2="15"></line>
							</svg>
						</div>
						<div>
							<div style="font-weight:800;font-size:14px;color:#b91c1c;margin-bottom:5px;">❌ Leave Rejected</div>
							<div style="font-size:13px;color:#334155;line-height:1.6;">This leave application has been <strong>rejected</strong>. Please contact your manager for further details.</div>
						</div>
					</div>`;
				$(html + style_tag()).prependTo(frm.page.wrapper.find('.page-body'));
				return;
			}

			// --- Pending/Action Required: blue banner ---
			// Only pick actions from the workflow-specific buttons, exclude generic entries like 'Help'
			let non_workflow_labels = ['help', 'email', 'duplicate', 'rename', 'delete', 'print', 'new', 'share', 'tags'];
			let action_labels = [];
			frm.page.wrapper.find('.actions-btn-group .dropdown-menu li a').each(function () {
				let txt = $(this).text().trim();
				if (txt && !non_workflow_labels.includes(txt.toLowerCase())) {
					action_labels.push(txt);
				}
			});

			let actions_html = '';
			if (action_labels.length > 0) {
				actions_html = action_labels
					.map(a => `<span style="display:inline-block;background:#dbeafe;color:#1d4ed8;padding:3px 12px;border-radius:20px;font-weight:700;font-size:11px;border:1px solid #bfdbfe;text-transform:uppercase;letter-spacing:0.6px;margin:0 3px;">${a}</span>`)
					.join('<span style="color:#94a3b8;font-size:12px;margin:0 3px;">or</span>');
				actions_html = `To proceed, click ${actions_html} from the <strong>Actions</strong> menu.`;
			} else {
				actions_html = `After creating this request, please perform the action to <strong>forward it to the line manager</strong> from the <strong>Actions</strong> menu in the top right.`;
			}

			let html = `
		<div class="custom-lm-notification" style="
					display:flex; align-items:flex-start; gap:16px;
					background:linear-gradient(135deg,#f0f7ff 0%,#ffffff 100%);
					border:1px solid #bfdbfe; border-left:5px solid #3b82f6;
					border-radius:12px; padding:18px 22px; margin: 0 0 18px 0;
					box-shadow: 0 4px 20px -4px rgba(59,130,246,0.15), 0 1px 4px rgba(0,0,0,0.05);
			animation: lm_notify_in 0.35s cubic-bezier(.22,.68,0,1.2);
					position:relative; overflow:hidden;
		">
					<div style="position:absolute;top:-20px;right:-20px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(147,197,253,0.3) 0%,transparent 70%);pointer-events:none;"></div>
					<div style="flex-shrink:0;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#eff6ff,#dbeafe);display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px rgba(219,234,254,0.6);margin-top:2px;">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="8" x2="12" y2="12"></line>
							<line x1="12" y1="16" x2="12.01" y2="16"></line>
				</svg>
			</div>
					<div style="flex:1;min-width:0;">
						<div style="font-weight:800;font-size:14px;color:#1e40af;margin-bottom:5px;letter-spacing:-0.2px;">⚡ Action Required</div>
						<div style="font-size:13px;color:#334155;line-height:1.6;">${actions_html}</div>
		</div>
				</div>`;
			$(html + style_tag()).prependTo(frm.page.wrapper.find('.page-body'));

		}, 500);
	}
});

function style_tag() {
	return `
		<style>
		@keyframes lm_notify_in {
			from { opacity:0; transform: translateY(-8px) scale(0.98); }
			to   { opacity:1; transform: translateY(0) scale(1); }
		}
		</style>`;
}
