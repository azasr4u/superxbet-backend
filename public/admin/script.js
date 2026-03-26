const API = "https://superxbet-backend.onrender.com/api";
let token = localStorage.getItem("token");
let role = localStorage.getItem("role");

/// ================= AUTH PROTECT =================
function protect() {
  if (!token) {
    window.location.href = "admin-login.html";
  }
}

/// ================= ROLE CONTROL =================
function applyRoleControl() {
  if (role !== "admin") {
    document.querySelectorAll(".admin-only")
      .forEach(e => e.style.display = "none");
  }
}

/// ================= LOGIN =================
async function login() {
  try {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const res = await fetch(API + "/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.status === 200) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      if (data.role === "agent") {
        window.location.href = "banking.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } else {
      alert(data.error || "Login failed");
    }

  } catch (err) {
    console.log(err);
    alert("Server error");
  }
}

/// ================= COMMON FETCH =================
function authHeaders() {
  return {
    "Authorization": "Bearer " + token,
    "Content-Type": "application/json"
  };
}

/// ================= LOAD DEPOSITS =================
async function loadDeposits() {
  try {
    const res = await fetch(API + "/admin/deposits", {
      headers: authHeaders()
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.log(err);
    alert("Failed to load deposits");
    return [];
  }
}

/// ================= LOAD WITHDRAWS =================
async function loadWithdraws() {
  try {
    const res = await fetch(API + "/admin/withdraws", {
      headers: authHeaders()
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.log(err);
    alert("Failed to load withdraws");
    return [];
  }
}

/// ================= APPROVE DEPOSIT =================
async function approveDeposit(id) {
  try {
    const res = await fetch(API + "/admin/deposit/approve/" + id, {
      method: "POST",
      headers: authHeaders()
    });

    const data = await res.json();
    alert(data.message || "Approved");

    location.reload();

  } catch (err) {
    console.log(err);
    alert("Approve failed");
  }
}

/// ================= APPROVE WITHDRAW =================
async function approveWithdraw(id) {
  try {
    const res = await fetch(API + "/admin/withdraw/approve/" + id, {
      method: "POST",
      headers: authHeaders()
    });

    const data = await res.json();
    alert(data.message || "Approved");

    location.reload();

  } catch (err) {
    console.log(err);
    alert("Approve failed");
  }
}

/// ================= LOAD USERS =================
async function loadUsers() {
  try {
    const res = await fetch(API + "/admin/users", {
      headers: authHeaders()
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.log(err);
    alert("Failed to load users");
    return [];
  }
}

/// ================= DELETE USER (ADMIN ONLY) =================
async function deleteUser(id) {
  try {
    const res = await fetch(API + "/admin/user/delete/" + id, {
      method: "POST",
      headers: authHeaders()
    });

    const data = await res.json();
    alert(data.message || "Deleted");

    location.reload();

  } catch (err) {
    console.log(err);
    alert("Delete failed");
  }
}

/// ================= LOAD KYC =================
async function loadKYC() {
  try {
    const res = await fetch(API + "/admin/kyc", {
      headers: authHeaders()
    });

    const data = await res.json();
    return data;

  } catch (err) {
    console.log(err);
    alert("Failed to load KYC");
    return [];
  }
}

/// ================= APPROVE KYC =================
async function approveKYC(id) {
  try {
    const res = await fetch(API + "/admin/kyc/approve/" + id, {
      method: "POST",
      headers: authHeaders()
    });

    const data = await res.json();
    alert(data.message || "Approved");

    location.reload();

  } catch (err) {
    console.log(err);
    alert("KYC failed");
  }
}

/// ================= LOGOUT =================
function logout() {
  localStorage.clear();
  window.location.href = "admin-login.html";
}