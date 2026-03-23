const API = "https://superxbet-backend.onrender.com/api/admin";

// LOGIN
async function login() {
  try {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/login", {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      alert("❌ Blocked by Hostinger (403)");
      console.log(text);
      return;
    }

    if (res.status === 200) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      window.location.href = "dashboard.html";
    } else {
      alert(data.error || "Login failed");
    }

  } catch (err) {
    alert("Network error");
    console.log(err);
  }
}

// LOAD DEPOSITS
async function loadDeposits() {
  const res = await fetch(API + "/deposits");
  const data = await res.json();
  render(data, "deposit");
}

// LOAD WITHDRAWS
async function loadWithdraws() {
  const res = await fetch(API + "/withdraws");
  const data = await res.json();
  render(data, "withdraw");
}

// RENDER
function render(list, type) {
  const div = document.getElementById("data");
  div.innerHTML = "";

  if (!list.length) {
    div.innerHTML = "<p>No data</p>";
    return;
  }

  list.forEach(item => {
    const user = item.userId?.phone || "Unknown";

    div.innerHTML += `
      <div style="border:1px solid #444; padding:10px; margin:10px;">
        <b>User:</b> ${user}<br>
        <b>Amount:</b> ₹${item.amount}<br>
        <b>Status:</b> ${item.status}<br><br>

        <button onclick="approve('${item._id}','${type}')">Approve</button>
        <button onclick="reject('${item._id}','${type}')">Reject</button>
      </div>
    `;
  });
}

// APPROVE
async function approve(id, type) {
  await fetch(`${API}/${type}/approve/${id}`, { method: "POST" });
  alert("Approved");
  location.reload();
}

// REJECT
async function reject(id, type) {
  await fetch(`${API}/${type}/reject/${id}`, { method: "POST" });
  alert("Rejected");
  location.reload();
}