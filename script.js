// Masters Gallery - Data from Google Sheets
// Columns expected: Name, Profile, Contact, Location
// Optional: Image (if present, will be used as card image). Otherwise a placeholder is shown.

const CONFIG = {
  SHEET_ID: "", // Optional if using DATA_ENDPOINT
  SHEET_NAME: "Masters", // TODO: set your Sheet tab name (or change to gid usage below)
  // If you prefer using gid instead of sheet name, set SHEET_GID and use buildGvizUrlByGid()
  SHEET_GID: null,
  // Optional: If you deploy the Apps Script web app, set its URL here to fetch directly
  // Example: 'https://script.google.com/macros/s/AKfycbx.../exec'
  DATA_ENDPOINT: "https://script.google.com/macros/s/AKfycbwLoM_BD9xQoe5WDUFkmGA5F-z-z-M3hVG8ujgO5L2pqKrSJ6PxzKRW5V_9QqNg7IEC/exec",
}
let masters = []
let selectedField = null
let selectedLocation = null
// Utilities
function showLoading() {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) overlay.classList.add("active")
  document.body.classList.add("loading")
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay")
  if (overlay) overlay.classList.remove("active")
  document.body.classList.remove("loading")
}

function buildGvizUrlByName(sheetId, sheetName) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
}

function buildGvizUrlByGid(sheetId, gid) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&gid=${gid}`
}

function parseGvizResponse(text) {
  // gviz returns: google.visualization.Query.setResponse({...});
  const prefix = "google.visualization.Query.setResponse("
  const suffix = ");"
  const start = text.indexOf(prefix)
  const end = text.lastIndexOf(suffix)
  const jsonStr = text.substring(start + prefix.length, end)
  return JSON.parse(jsonStr)
}

function safeCell(row, index) {
  const cell = row.c[index]
  if (!cell || typeof cell.v === "undefined" || cell.v === null) return ""
  return String(cell.v).trim()
}

function deriveColumnMap(cols) {
  // Map column labels to indexes, case-insensitive
  const map = {}
  cols.forEach((col, idx) => {
    const label = (col.label || "").trim().toLowerCase()
    if (!label) return
    map[label] = idx
  })
  return map
}

async function fetchMasters() {
  // 1) Prefer backend endpoint if provided
  if (CONFIG.DATA_ENDPOINT) {
    try {
      const res = await fetch(CONFIG.DATA_ENDPOINT, { method: "GET" })
      const data = await res.json()
      if (Array.isArray(data)) {
        return data
          .map((it) => ({
            name: String(it.name || "").trim(),
            field: String(it.field || it.profile || "").trim(),
            contact: String(it.contact || "").trim(),
            location: String(it.location || "").trim(),
            image: String(it.image || "").trim() || "/placeholder.svg?height=400&width=340",
          }))
          .filter((m) => m.name || m.field || m.location || m.contact)
      }
      // If backend returns wrapped object like {ok, data}, try common patterns
      if (data && Array.isArray(data.items)) {
        return data.items
          .map((it) => ({
            name: String(it.name || "").trim(),
            field: String(it.field || it.profile || "").trim(),
            contact: String(it.contact || "").trim(),
            location: String(it.location || "").trim(),
            image: String(it.image || "").trim() || "/placeholder.svg?height=400&width=340",
          }))
          .filter((m) => m.name || m.field || m.location || m.contact)
      }
    } catch (err) {
      console.warn("Failed to fetch from DATA_ENDPOINT, falling back to Google Sheets.", err)
    }
  }

  // 2) Fall back to Google Sheets gviz public read
  if (!CONFIG.SHEET_ID) {
    console.warn("Neither DATA_ENDPOINT nor SHEET_ID set. Using sample fallback data.")
    return sampleData()
  }

  const url = CONFIG.SHEET_GID
    ? buildGvizUrlByGid(CONFIG.SHEET_ID, CONFIG.SHEET_GID)
    : buildGvizUrlByName(CONFIG.SHEET_ID, CONFIG.SHEET_NAME)

  const res = await fetch(url)
  const text = await res.text()
  const data = parseGvizResponse(text)

  const cols = data.table.cols
  const rows = data.table.rows || []
  const colMap = deriveColumnMap(cols)

  const idxName = colMap["name"]
  const idxProfile = colMap["profile"] || colMap["field"] || colMap["profession"]
  const idxContact = colMap["contact"] || colMap["email"] || colMap["phone"]
  const idxLocation = colMap["location"] || colMap["city"] || colMap["place"]
  const idxImage = colMap["image"] // optional

  const result = rows
    .map((r) => {
      const name = typeof idxName === "number" ? safeCell(r, idxName) : ""
      const field = typeof idxProfile === "number" ? safeCell(r, idxProfile) : ""
      const contact = typeof idxContact === "number" ? safeCell(r, idxContact) : ""
      const location = typeof idxLocation === "number" ? safeCell(r, idxLocation) : ""
      const image = typeof idxImage === "number" ? safeCell(r, idxImage) : ""
      if (!name && !field && !location && !contact) return null
      return {
        name,
        field,
        contact,
        location,
        image: image || "/placeholder.svg?height=400&width=340",
      }
    })
    .filter(Boolean)

  return result
}

function sampleData() {
  return [
    { name: "Yuki Tanaka", field: "Clothes Design", location: "Kyoto, Japan", contact: "yuki.tanaka@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Marco Bellini", field: "Sculpture", location: "Florence, Italy", contact: "marco.bellini@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Sofia Martinez", field: "Coffee", location: "Medellín, Colombia", contact: "sofia.martinez@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Erik Johansson", field: "Woodcraft", location: "Stockholm, Sweden", contact: "erik.johansson@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Amara Okafor", field: "Clothes Design", location: "Lagos, Nigeria", contact: "amara.okafor@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Li Wei", field: "Sculpture", location: "Beijing, China", contact: "li.wei@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Isabella Costa", field: "Coffee", location: "São Paulo, Brazil", contact: "isabella.costa@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Hans Mueller", field: "Woodcraft", location: "Munich, Germany", contact: "hans.mueller@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Priya Sharma", field: "Clothes Design", location: "Mumbai, India", contact: "priya.sharma@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Jean Dubois", field: "Sculpture", location: "Paris, France", contact: "jean.dubois@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Ayana Bekele", field: "Coffee", location: "Addis Ababa, Ethiopia", contact: "ayana.bekele@email.com", image: "/placeholder.svg?height=400&width=340" },
    { name: "Robert Chen", field: "Woodcraft", location: "Portland, USA", contact: "robert.chen@email.com", image: "/placeholder.svg?height=400&width=340" },
  ]
}

// UI helpers
function uniqueValues(arr) {
  return [...new Set(arr.filter((v) => v && v.trim()))]
}

function populateMarquee(containerId, items, type) {
  const container = document.getElementById(containerId)
  if (!container) return
  const duplicatedItems = [...items, ...items]
  container.innerHTML = duplicatedItems
    .map((item) => `<span class="marquee-item" data-${type}="${item}">${item}</span>`)
    .join("")
}

function renderGallery() {
  const gallery = document.getElementById("gallery")
  const emptyState = document.getElementById("emptyState")
  if (!gallery || !emptyState) return

  let filtered = masters
  if (selectedField) filtered = filtered.filter((m) => m.field === selectedField)
  if (selectedLocation) filtered = filtered.filter((m) => m.location === selectedLocation)

  if (filtered.length === 0) {
    gallery.style.display = "none"
    emptyState.style.display = "block"
    return
  }

  gallery.style.display = "grid"
  emptyState.style.display = "none"

  gallery.innerHTML = filtered
    .map(
      (master) => `
      <div class="master-card" data-master='${JSON.stringify(master)}'>
        <img class="card-image" src="${master.image}" alt="${master.name}">
        <div class="card-content">
          <h3 class="card-name">${master.name}</h3>
          <p class="card-field">${master.field}</p>
          <p class="card-location">${master.location}</p>
        </div>
      </div>
    `,
    )
    .join("")

  document.querySelectorAll(".master-card").forEach((card) => {
    card.addEventListener("click", () => {
      try {
        const master = JSON.parse(card.dataset.master)
        openModal(master)
      } catch (e) {
        console.error("Failed to parse master data", e)
      }
    })
  })
}

function wireMarquees() {
  const fieldsEl = document.getElementById("fieldsMarquee")
  const locationsEl = document.getElementById("locationsMarquee")

  if (fieldsEl) {
    fieldsEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("marquee-item")) {
        const field = e.target.dataset.field
        selectedField = selectedField === field ? null : field
        document.querySelectorAll("[data-field]").forEach((item) => {
          item.classList.toggle("active", item.dataset.field === selectedField)
        })
        renderGallery()
      }
    })
  }

  if (locationsEl) {
    locationsEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("marquee-item")) {
        const location = e.target.dataset.location
        selectedLocation = selectedLocation === location ? null : location
        document.querySelectorAll("[data-location]").forEach((item) => {
          item.classList.toggle("active", item.dataset.location === selectedLocation)
        })
        renderGallery()
      }
    })
  }
}

// Modal
function openModal(master) {
  const modal = document.getElementById("modal")
  if (!modal) return
  document.getElementById("modalImage").src = master.image
  document.getElementById("modalName").textContent = master.name
  document.getElementById("modalField").textContent = master.field
  document.getElementById("modalLocation").textContent = master.location
  document.getElementById("modalContact").textContent = master.contact
  modal.classList.add("active")
  document.body.style.overflow = "hidden"
}

function closeModal() {
  const modal = document.getElementById("modal")
  if (!modal) return
  modal.classList.remove("active")
  document.body.style.overflow = "auto"
}

function wireModal() {
  const closeBtn = document.getElementById("modalClose")
  const modal = document.getElementById("modal")
  if (closeBtn) closeBtn.addEventListener("click", closeModal)
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "modal") closeModal()
    })
  }
}

// Init
document.addEventListener("DOMContentLoaded", async () => {
  wireModal()
  wireMarquees()

  showLoading()
  try {
    masters = await fetchMasters()
  } catch (e) {
    console.error("Failed to fetch from Google Sheets, using sample data.", e)
    masters = sampleData()
  } finally {
    const fields = uniqueValues(masters.map((m) => m.field))
    const locations = uniqueValues(masters.map((m) => m.location))

    populateMarquee("fieldsMarquee", fields, "field")
    populateMarquee("locationsMarquee", locations, "location")

    renderGallery()
    hideLoading()
  }
})
