frappe.ui.form.on("HD Ticket", {
  refresh(frm) {
    if (frm.timeline && !frm.timeline.compose_mail.is_custom_wrapped) {
      const original_compose_mail = frm.timeline.compose_mail;
      frm.timeline.compose_mail = function(communication_doc = null, reply_all = false) {
        const OriginalComposer = frappe.views.CommunicationComposer;
        try {
          frappe.views.CommunicationComposer = class extends OriginalComposer {
            constructor(opts) {
              if (frm.doc.email_account) {
                const account = (frappe.boot.email_accounts || []).find(
                  (a) => a.email_account === frm.doc.email_account
                );
                if (account && account.email_id) {
                  opts.sender = account.email_id;
                }
              }
              super(opts);
            }
          };
          original_compose_mail.call(this, communication_doc, reply_all);
        } finally {
          frappe.views.CommunicationComposer = OriginalComposer;
        }
      };
      frm.timeline.compose_mail.is_custom_wrapped = true;
    }
  }
});
