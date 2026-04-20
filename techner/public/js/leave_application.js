frappe.ui.form.on('Leave Application', {
	refresh: function (frm) {
		setTimeout(() => {
			$('.custom-lm-notification').remove();
			if (frm.is_new()) return;

			let state = (frm.doc.employee_workflow_state || '').toLowerCase();
			if (!state) return;

			let config = get_config(state);

			if (config) {
				$(build_notification(config)).prependTo(frm.page.wrapper.find('.page-body'));
			}

		}, 300);
	}
});

function get_config(state) {
	if (state === 'pending') {
		return { title: 'Pending', msg: 'Please forward this application to the respective Line Manager for Approval', color: '#3b82f6', icon: '⏳' };
	}
	if (state.includes('line manager')) {
		return { title: 'Line Manager Approval', msg: 'Waiting for Line Manager approval', color: '#f59e0b', icon: '👤' };
	}
	if (state.includes('hr')) {
		return { title: 'HR Approval', msg: 'Waiting for HR approval', color: '#f59e0b', icon: '🏢' };
	}
	if (state.includes('it manager')) {
		return { title: 'IT Approval', msg: 'Waiting for IT Manager approval', color: '#f59e0b', icon: '💻' };
	}
	if (state === 'approved') {
		return { title: 'Approved', msg: 'Leave application approved', color: '#22c55e', icon: '✅' };
	}
	if (state === 'rejected') {
		return { title: 'Rejected', msg: 'Leave application rejected', color: '#ef4444', icon: '❌' };
	}
}

function build_notification(c) {
	return `
	<div class="custom-lm-notification" style="
		display:flex;
		align-items:center;
		gap:12px;
		padding:14px 16px;
		margin-bottom:12px;
		border-radius:10px;
		background: linear-gradient(135deg, #ffffff, #f8fafc);
		border:1px solid #e5e7eb;
		box-shadow:0 6px 18px rgba(0,0,0,0.08);
		border-left:6px solid ${c.color};
		font-family: sans-serif;
		transition: all 0.3s ease;
	">
		<div style="
			width:38px;
			height:38px;
			border-radius:50%;
			background:${c.color};
			display:flex;
			align-items:center;
			justify-content:center;
			color:white;
			font-size:18px;
		">
			${c.icon}
		</div>

		<div>
			<div style="font-weight:600; font-size:14px; color:#111827;">
				${c.title}
			</div>
			<div style="font-size:12px; color:#6b7280; margin-top:2px;">
				${c.msg}
			</div>
		</div>
	</div>`;
}

