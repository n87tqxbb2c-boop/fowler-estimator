const Store = {
  load() {
    const raw = localStorage.getItem("fowler_estimator_v1");
    return raw ? JSON.parse(raw) : {
      customers: [],
      jobs: [],
      activeCustomerId: null,
      activeJobId: null,
      estimate: { items: [] },
      terms: {
        depositPercent: 50,
        depositEnabled: true,
        depositText: "Deposit: 50% due upfront for materials. Remaining balance due upon completion.",
        materialWindowText: "Scheduling/Materials: Work is typically scheduled within 72 hours after deposit is received and materials are gathered (weather permitting).",
        warrantyText: "Warranty: 2-year workmanship warranty.",
        extraWorkText: "Extra Work: Any work not outlined in this agreement will be charged as labor plus material cost plus a 30% markup."
      }
    };
  },
  save(state) {
    localStorage.setItem("fowler_estimator_v1", JSON.stringify(state));
  }
};

const money = (n) => `$${(Number(n)||0).toFixed(2)}`;
const depositAmount = (total) => (Number(total) || 0) * 0.50; // 50%
// --- Deposit (always 50%) for print/PDF ---
function getEstimateTotal(state) {
  const items = state?.estimate?.items || [];
  return items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
}

function updatePrintDeposit(state) {
  const el = document.getElementById("printDeposit");
  if (!el) return;

  const total = getEstimateTotal(state);
  const deposit = total * 0.50;

  el.innerHTML = `<strong>Deposit Required:</strong> ${money(deposit)} (50% of total) due at contract signing`;
}
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

const App = {
  state: Store.load(),
  view: "customers",

  go(view) { this.view = view; this.render(); },

  setActiveCustomer(id) {
    this.state.activeCustomerId = id;
    // auto filter jobs to that customer
    const j = this.state.jobs.find(x => x.customerId === id);
    if (j) this.state.activeJobId = j.id;
    Store.save(this.state);
    this.render();
  },

  setActiveJob(id) {
    this.state.activeJobId = id;
    Store.save(this.state);
    this.render();
  },

  addCustomer() {
    const name = document.getElementById("c_name").value.trim();
    const phone = document.getElementById("c_phone").value.trim();
    const address = document.getElementById("c_address").value.trim();
    if (!name) return alert("Customer name is required.");
    this.state.customers.push({ id: uid(), name, phone, address, createdAt: new Date().toISOString() });
    Store.save(this.state);
    document.getElementById("c_name").value = "";
    document.getElementById("c_phone").value = "";
    document.getElementById("c_address").value = "";
    this.render();
  },

  addJob() {
    const customerId = this.state.activeCustomerId;
    if (!customerId) return alert("Select a customer first.");
    const title = document.getElementById("j_title").value.trim();
    const location = document.getElementById("j_location").value.trim();
    const notes = document.getElementById("j_notes").value.trim();
    if (!title) return alert("Job title is required.");
    const job = { id: uid(), customerId, title, location, notes, createdAt: new Date().toISOString() };
    this.state.jobs.push(job);
    this.state.activeJobId = job.id;
    Store.save(this.state);
    document.getElementById("j_title").value = "";
    document.getElementById("j_location").value = "";
    document.getElementById("j_notes").value = "";
    this.render();
  },

  addItem() {
    const desc = document.getElementById("i_desc").value.trim();
    const price = document.getElementById("i_price").value.trim();
    if (!desc) return alert("Scope of Work is required.");
    const p = Number(price);
    if (!Number.isFinite(p)) return alert("Enter a valid price.");
    this.state.estimate.items.push({ id: uid(), desc, price: p });
    Store.save(this.state);
    document.getElementById("i_desc").value = "";
    document.getElementById("i_price").value = "";
    this.render();
  },

  removeItem(id) {
    this.state.estimate.items = this.state.estimate.items.filter(x => x.id !== id);
    Store.save(this.state);
    this.render();
  },

  total() {
    return this.state.estimate.items.reduce((s, x) => s + (Number(x.price)||0), 0);
  },

  exportText() {
    const cust = this.state.customers.find(c => c.id === this.state.activeCustomerId);
    const job = this.state.jobs.find(j => j.id === this.state.activeJobId);

    const lines = [];
    lines.push("Fowler’s Handyman Service LLC — 912-293-7202");
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    if (cust) {
      lines.push(`Customer: ${cust.name}`);
      if (cust.phone) lines.push(`Phone: ${cust.phone}`);
      if (cust.address) lines.push(`Address: ${cust.address}`);
    }
    if (job) {
      lines.push(`Job: ${job.title}`);
      if (job.location) lines.push(`Job Location: ${job.location}`);
      if (job.notes) lines.push(`Notes: ${job.notes}`);
    }
    lines.push("");
    lines.push("ESTIMATE");
    lines.push("--------------------------------");
    this.state.estimate.items.forEach((it, idx) => {
      lines.push(`${idx+1}. ${it.desc} — ${money(it.price)}`);
    });
    lines.push("--------------------------------");
    lines.push(`TOTAL: ${money(this.total())}`);
    lines.push("");
    lines.push("TERMS");
    lines.push(`- ${this.state.terms.depositText}`);
    lines.push(`- ${this.state.terms.materialWindowText}`);
    lines.push(`- ${this.state.terms.warrantyText}`);
    lines.push(`- ${this.state.terms.extraWorkText}`);

    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard. Paste into Messages/Email. (PDF export comes next.)");
    }).catch(() => {
      // fallback: show prompt
      prompt("Copy this:", text);
    });
  },

  saveTerms() {
    this.state.terms.depositText = document.getElementById("t_deposit").value.trim();
    this.state.terms.materialWindowText = document.getElementById("t_window").value.trim();
    this.state.terms.warrantyText = document.getElementById("t_warranty").value.trim();
    this.state.terms.extraWorkText = document.getElementById("t_extra").value.trim();
    Store.save(this.state);
    alert("Saved.");
  },

  render() {
    const el = document.getElementById("app");
    const s = this.state;
    const activeCustomer = s.customers.find(c => c.id === s.activeCustomerId);
    const activeJob = s.jobs.find(j => j.id === s.activeJobId);

    const topStatus = `
      <div class="card">
        <div class="row">
          <span class="pill">Customer: <b>${activeCustomer ? activeCustomer.name : "None selected"}</b></span>
          <span class="pill">Job: <b>${activeJob ? activeJob.title : "None selected"}</b></span>
          <span class="right muted">Offline • Saved on device</span>
        </div>
      </div>
    `;

    if (this.view === "customers") {
      el.innerHTML = topStatus + `
        <div class="card">
          <h3>Add Customer</h3>
          <div class="row">
            <input id="c_name" placeholder="Customer name (required)" />
            <input id="c_phone" placeholder="Phone" />
            <input id="c_address" placeholder="Address" />
          </div>
          <div style="margin-top:10px">
            <button class="btn" onclick="App.addCustomer()">Add Customer</button>
          </div>
        </div>

        <div class="card list">
          <h3>Customers</h3>
          ${s.customers.length ? "" : `<div class="muted">No customers yet.</div>`}
          ${s.customers.map(c => `
            <button class="btn2" onclick="App.setActiveCustomer('${c.id}')">
              <b>${c.name}</b><div class="muted">${c.phone || ""} ${c.address ? " • " + c.address : ""}</div>
            </button>
          `).join("")}
        </div>
      `;
      return;
    }

    if (this.view === "jobs") {
      const jobs = s.activeCustomerId ? s.jobs.filter(j => j.customerId === s.activeCustomerId) : [];
      el.innerHTML = topStatus + `
        <div class="card">
          <h3>Add Job</h3>
          <div class="muted">Select a customer first on the Customers tab.</div>
          <div class="row" style="margin-top:10px">
            <input id="j_title" placeholder="Job title (required) e.g., Roof & Shed Repair" />
            <input id="j_location" placeholder="Job location (optional)" />
            <textarea id="j_notes" placeholder="Notes (optional)" rows="3"></textarea>
          </div>
          <div style="margin-top:10px">
            <button class="btn" onclick="App.addJob()">Add Job</button>
          </div>
        </div>

        <div class="card list">
          <h3>Jobs</h3>
          ${jobs.length ? "" : `<div class="muted">No jobs for this customer yet.</div>`}
          ${jobs.map(j => `
            <button class="btn2" onclick="App.setActiveJob('${j.id}')">
              <b>${j.title}</b><div class="muted">${j.location || ""}</div>
            </button>
          `).join("")}
        </div>
      `;
      return;
    }

    if (this.view === "estimate") {
      el.innerHTML = topStatus + `
        <div class="card">
          <h3>Add Estimate Line Item</h3>
          <div class="row">
            <textarea id="i_desc" placeholder="Scope of Work (required)" rows="3"></textarea>
            <input id="i_price" inputmode="decimal" placeholder="Price (e.g., 1500)" />
          </div>
          <div style="margin-top:10px" class="row">
            <button class="btn" onclick="App.addItem()">Add Line</button>
            <button class="btn2" onclick="App.exportText()">Copy Estimate Text</button>
          </div>
        </div>

        <div class="card">
          <h3>Estimate</h3>
          ${s.estimate.items.length ? "" : `<div class="muted">No line items yet.</div>`}
          ${s.estimate.items.map(it => `
            <div class="card" style="margin:10px 0">
              <div><b>${it.desc}</b></div>
              <div class="row" style="margin-top:6px">
                <span class="pill">${money(it.price)}</span>
                <span class="right"><button class="danger" onclick="App.removeItem('${it.id}')">Remove</button></span>
              </div>
            </div>
          `).join("")}
          <div class="row" style="align-items:center; margin-top:8px">
            <div class="total">TOTAL: ${money(App.total())}</div>
            </div>
            <div class="muted" id="depositLine"></div>
          </div>
      `;
      
      setTimeout(() => {
  const total = App.total();
  const dep = depositAmount(total);
  const txt = `Deposit Required: ${money(dep)} (50% of total) due at contract signing`;

  const depEl = document.getElementById("depositLine");
  if (depEl) depEl.textContent = txt;

  const printEl = document.getElementById("printDeposit");
  if (printEl) printEl.textContent = txt;
}, 0);
      return;
    }

    if (this.view === "settings") {
      el.innerHTML = topStatus + `
        <div class="card">
          <h3>Default Terms (Editable)</h3>
          <div class="muted">These will be included in your copied estimate text. PDF formatting comes next.</div>
          <div style="margin-top:10px">
            <label class="muted">Deposit</label>
            <textarea id="t_deposit" rows="2">${s.terms.depositText}</textarea>
            <label class="muted">72-hour window</label>
            <textarea id="t_window" rows="2">${s.terms.materialWindowText}</textarea>
            <label class="muted">Warranty</label>
            <textarea id="t_warranty" rows="2">${s.terms.warrantyText}</textarea>
            <label class="muted">Extra work clause (30% markup)</label>
            <textarea id="t_extra" rows="2">${s.terms.extraWorkText}</textarea>
          </div>
          <div style="margin-top:10px">
            <button class="btn" onclick="App.saveTerms()">Save Terms</button>
          </div>
        </div>
      `;
      return;
    }
  }
};

window.App = App;
App.render();
const state = Store.load();
updatePrintDeposit(state);
