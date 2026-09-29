const {onDocumentCreated}=require("firebase-functions/v2/firestore");
const {defineSecret}=require("firebase-functions/params");
const admin=require("firebase-admin");const nodemailer=require("nodemailer");
admin.initializeApp();
const PASS=defineSecret("GMAIL_APP_PASSWORD");const TO="centralservicepoint@gmail.com";
const send=(subject,text)=>nodemailer.createTransport({service:"gmail",auth:{user:TO,pass:PASS.value()}}).sendMail({from:TO,to:TO,subject,text});

exports.onQuote=onDocumentCreated({document:"quotationRequests/{id}",secrets:[PASS]},async e=>{
  const d=e.data.data();
  // Contractor details come from the database, not from the customer's browser
  const c=(await admin.firestore().doc("contractors/"+d.contractorId).get()).data()||{};
  await send(`New Quotation Request — ${d.contractorName} — ${d.name}`,
`NEW CENTRAL SERVICE POINT QUOTATION REQUEST

Contractor Requested:
${d.contractorName}

Contractor ID:
${d.contractorId}

Reference:
${d.ref}

Customer Name:
${d.name}

Customer Phone:
${d.phone}

Customer Email:
${d.email}

Project Location:
${d.ploc}

Service Required:
${d.service}

Project Description:
${d.desc}

Preferred Date:
${d.date2||""}

Budget:
${d.budget||""}

Additional Information:
${d.extra||""}

Contractor Contact Information:
Phone: ${c.phone||""}
WhatsApp: ${c.wa||""}
Email: ${c.email||""}
Website: ${c.web||""}`);
});

exports.onListing=onDocumentCreated({document:"contractors/{id}",secrets:[PASS]},async e=>{
  const d=e.data.data();
  if(d.approved) return;
  await send(`New Business Listing Request — ${d.name}`,Object.entries(d).map(([k,v])=>`${k}: ${v}`).join("\n"));
});

exports.onMessage=onDocumentCreated({document:"messages/{id}",secrets:[PASS]},async e=>{
  const d=e.data.data();
  await send(`Website enquiry — ${d.subject||"No subject"}`,`Name: ${d.name}\nEmail: ${d.email}\nPhone: ${d.phone||""}\n\n${d.message}`);
});
