// ✅ AUTO API URL (BEST PRACTICE)
const API = "https://superxbet-backend.onrender.com/api/admin";

// ================= LOGIN =================
async function login() {
  try {
    console.log("Login clicked");

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    console.log("LOGIN RESPONSE:", data);

    if (res.status === 200) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      window.location.href = "dashboard.html";
    } else {
      alert(data.error || "Login failed");
    }

  } catch (err) {
    console.log("LOGIN ERROR:", err);
    alert("Server error");
  }
}


// ================= LOAD DEPOSITS =================
async function loadDeposits() {
  const token = localStorage.getItem("token");

  const res = await fetch(API + "/deposits", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const data = await res.json();
  render(data, "deposit");
}


// ================= LOAD WITHDRAWS =================
async function loadWithdraws() {
  const token = localStorage.getItem("token");

  const res = await fetch(API + "/withdraws", {
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  const data = await res.json();
  render(data, "withdraw");
}


// ================= RENDER =================
function render(list, type) {
  const div = document.getElementById("data");
  div.innerHTML = "";

  if (!list || !list.length) {
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


// ================= APPROVE =================
async function approve(id, type) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/${type}/approve/${id}`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  alert("Approved");
  location.reload();
}


// ================= REJECT =================
async function reject(id, type) {
  const token = localStorage.getItem("token");

  await fetch(`${API}/${type}/reject/${id}`, {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + token
    }
  });

  alert("Rejected");
  location.reload();
}