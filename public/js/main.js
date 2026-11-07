// main.js — Telas do site: o cardápio público e a área do administrador (#admin).
// Monta o HTML a partir dos itens e responde aos cliques e formulários.
// Tudo o que é banco de dados ou login fica no db.js.
import {
  firebaseConfigured, ouvirCardapio, gravarItensIniciais, salvarItem, excluirItem,
  aoMudarLogin, entrar, sair,
} from "./db.js";

const initialItems = [
  ...[
    ["Picanha", 14],
    ["Alcatra", 10],
    ["Kafta", 9],
    ["Queijo", 9],
    ["Medalhão de frango", 10],
    ["Medalhão de mandioca c/ queijo", 10],
    ["Medalhão de filé mignon", 12],
    ["Medalhão de romeu e julieta", 10],
    ["Pernil suíno", 9],
    ["Frango", 9],
    ["Linguiça apimentada", 9],
    ["Linguiça costela c/ fraldinha", 9],
    ["Calabresa", 9],
    ["Misto", 9],
    ["Tulipa", 9],
    ["Coração", 9],
  ].map(function (item, index) {
    return {
      id: `skewer-${index}`,
      category: "skewer",
      name: item[0],
      price: item[1],
      mediumPrice: null,
      largePrice: null,
      sortOrder: index,
    };
  }),
  ...[
    ["Tropeiro", 8, 12],
    ["Arroz", 7, 9],
    ["Vinagrete", 7, 9],
    ["Farofa de manteiga", 7, 9],
    ["Farofa de banana da terra", 7, 12],
    ["Batata frita (500g)", 14, 22],
    ["Pururuca", 9, null],
    ["Pão de alho gourmet", 8, 15],
  ].map(function (item, index) {
    return {
      id: `side-${index}`,
      category: "side",
      name: item[0],
      price: null,
      mediumPrice: item[1],
      largePrice: item[2],
      sortOrder: index,
    };
  }),
];

const app = document.querySelector("#app");
const state = {
  items: initialItems,
  user: null,
  authLoading: firebaseConfigured,
  loading: false,
  email: "",
  error: "",
  message: "",
  savingId: "",
  addingCategory: "",
  menuUnsubscribe: null,
  didSeedMenu: false,
};

function escapeHtml(value) {
  const characters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    return characters[character];
  });
}

function formatPrice(value) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function showNotice(message, type) {
  if (!message) {
    return "";
  }

  let className = "";
  let role = "status";

  if (type === "error") {
    className = "error-notice";
    role = "alert";
  } else if (type === "success") {
    className = "success-notice";
  }

  return `<p class="notice ${className}" role="${role}">${escapeHtml(message)}</p>`;
}

function updateNotice(id, message, type) {
  const notice = document.querySelector(`#${id}`);
  notice.innerHTML = showNotice(message, type);
  notice.hidden = !message;
}

function renderSkewer(item) {
  return `
    <div class="menu-item">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="single-price">R$ ${formatPrice(item.price)}</span>
    </div>`;
}

function renderSide(item) {
  let largePrice = "—";
  let largePriceClass = "size-value unavailable";

  if (item.largePrice != null) {
    largePrice = `R$ ${formatPrice(item.largePrice)}`;
    largePriceClass = "size-value";
  }

  return `
    <div class="menu-item">
      <span class="item-name">${escapeHtml(item.name)}</span>
      <span class="size-prices">
        <span class="size-price">
          <span class="size-label">Médio</span>
          <span class="size-value">R$ ${formatPrice(item.mediumPrice)}</span>
        </span>
        <span class="size-price">
          <span class="size-label">Grande</span>
          <span class="${largePriceClass}">${largePrice}</span>
        </span>
      </span>
    </div>`;
}

function renderPublicMenu() {
  const skewers = state.items.filter(function (item) {
    return item.category === "skewer";
  });
  const sides = state.items.filter(function (item) {
    return item.category === "side";
  });

  document.querySelector("#skewer-list").innerHTML = skewers.map(renderSkewer).join("");
  document.querySelector("#side-list").innerHTML = sides.map(renderSide).join("");
  updateNotice("menu-error", state.error, "error");

  let firebaseMessage = "";
  if (!firebaseConfigured) {
    firebaseMessage = "Exibindo o cardápio inicial. Configure o Firebase para carregar as alterações do painel.";
  }
  updateNotice("firebase-notice", firebaseMessage, "");
}

function renderItemForm(item) {
  const template = document.querySelector("#admin-item-template");
  const form = template.content.firstElementChild.cloneNode(true);
  const isNewItem = item.id.startsWith("new-");
  const isSaving = state.savingId === item.id;

  form.dataset.itemId = item.id;
  form.dataset.category = item.category;
  form.querySelector('[name="name"]').value = item.name;
  form.querySelector('[name="price"]').value = item.price ?? "";
  form.querySelector('[name="mediumPrice"]').value = item.mediumPrice ?? "";
  form.querySelector('[name="largePrice"]').value = item.largePrice ?? "";

  const skewerFields = form.querySelectorAll(".skewer-price-field");
  skewerFields.forEach(function (field) {
    field.hidden = item.category !== "skewer";
    field.querySelector("input").disabled = field.hidden;
  });

  const sideFields = form.querySelectorAll(".side-price-field");
  sideFields.forEach(function (field) {
    field.hidden = item.category !== "side";
    field.querySelector("input").disabled = field.hidden;
  });

  const saveButton = form.querySelector('[type="submit"]');
  saveButton.disabled = isSaving;
  saveButton.textContent = isSaving ? "Salvando..." : "Salvar";

  const deleteButton = form.querySelector("[data-delete-id]");
  deleteButton.dataset.deleteId = item.id;
  deleteButton.hidden = isNewItem;
  deleteButton.disabled = isSaving;

  return form;
}

function renderAdminSection(category, listId) {
  const list = document.querySelector(`#${listId}`);
  list.innerHTML = "";

  if (state.addingCategory === category) {
    const newItem = {
      id: `new-${category}`,
      category: category,
      name: "",
      price: category === "skewer" ? "" : null,
      mediumPrice: category === "side" ? "" : null,
      largePrice: null,
    };
    list.appendChild(renderItemForm(newItem));
  }

  const categoryItems = state.items.filter(function (item) {
    return item.category === category;
  });

  categoryItems.forEach(function (item) {
    list.appendChild(renderItemForm(item));
  });
}

function renderAdminPanel() {
  const notConfigured = document.querySelector("#firebase-not-configured");
  const authLoading = document.querySelector("#auth-loading");
  const loginForm = document.querySelector("#login-form");
  const editor = document.querySelector("#admin-editor");
  const adminSections = document.querySelector("#admin-sections");
  const itemsLoading = document.querySelector("#items-loading");

  notConfigured.hidden = firebaseConfigured;
  authLoading.hidden = !firebaseConfigured || !state.authLoading;
  loginForm.hidden = !firebaseConfigured || state.authLoading || Boolean(state.user);
  editor.hidden = !firebaseConfigured || state.authLoading || !state.user;

  if (!firebaseConfigured || state.authLoading || !state.user) {
    return;
  }

  updateNotice("login-error", state.error, "error");
  updateNotice("admin-error", state.error, "error");
  updateNotice("admin-message", state.message, "success");

  itemsLoading.hidden = !state.loading;
  adminSections.hidden = state.loading;

  if (!state.loading) {
    renderAdminSection("skewer", "skewer-editor-list");
    renderAdminSection("side", "side-editor-list");
  }
}

function renderPage() {
  const publicPage = document.querySelector("#public-page");
  const adminPage = document.querySelector("#admin-page");
  const isAdminPage = window.location.hash === "#admin";

  publicPage.hidden = isAdminPage;
  adminPage.hidden = !isAdminPage;

  if (isAdminPage) {
    renderAdminPanel();
  } else {
    renderPublicMenu();
  }
}

function convertToPrice(text) {
  if (!text.trim()) {
    return null;
  }

  const number = Number(text.trim().replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

function startAdminMenuListener() {
  if (state.menuUnsubscribe) {
    state.menuUnsubscribe();
    state.menuUnsubscribe = null;
  }

  if (!firebaseConfigured || !state.user) {
    return;
  }

  state.loading = true;
  renderPage();

  state.menuUnsubscribe = ouvirCardapio(
    async function (itens, vazio) {
      state.items = itens;

      // Cardápio vazio no banco: grava os exemplos de initialItems (só uma vez)
      if (vazio && !state.didSeedMenu) {
        state.didSeedMenu = true;
        try {
          await gravarItensIniciais(initialItems);
        } catch (error) {
          state.error = `Não foi possível inicializar o cardápio: ${error.message}`;
        }
      } else {
        state.error = "";
      }

      state.loading = false;
      renderPage();
    },
    function (error) {
      state.error = `Não foi possível carregar os itens: ${error.message}`;
      state.loading = false;
      renderPage();
    },
  );
}

function startFirebaseListeners() {
  if (!firebaseConfigured) {
    state.authLoading = false;
    return;
  }

  ouvirCardapio(
    function (itens, vazio) {
      if (!state.user) {
        // Enquanto o banco está vazio, o cardápio mostra os exemplos
        state.items = vazio ? initialItems : itens;

        if (window.location.hash !== "#admin") {
          renderPage();
        }
      }
    },
    function (error) {
      state.error = `Não foi possível carregar o cardápio atualizado: ${error.message}`;
      if (window.location.hash !== "#admin") {
        renderPage();
      }
    },
  );

  aoMudarLogin(
    function (user) {
      state.user = user;
      state.authLoading = false;
      state.error = "";
      state.message = "";
      startAdminMenuListener();
      renderPage();
    },
    function (error) {
      state.error = `Não foi possível verificar o login: ${error.message}`;
      state.authLoading = false;
      renderPage();
    },
  );
}

async function handleLogin(form) {
  const formData = new FormData(form);
  state.email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  state.error = "";
  renderPage();

  try {
    await entrar(state.email, password);
  } catch (error) {
    state.error = `Não foi possível entrar: ${error.message}`;
    renderPage();
  }
}

async function handleSaveItem(form) {
  const formData = new FormData(form);
  const category = form.dataset.category;
  const itemId = form.dataset.itemId;
  const name = String(formData.get("name") || "").trim();
  const price = category === "skewer"
    ? convertToPrice(String(formData.get("price") || ""))
    : null;
  const mediumPrice = category === "side"
    ? convertToPrice(String(formData.get("mediumPrice") || ""))
    : null;
  const largePriceText = String(formData.get("largePrice") || "");
  let largePrice = null;

  if (category === "side" && largePriceText.trim()) {
    largePrice = convertToPrice(largePriceText);
  }

  if (!name) {
    state.error = "Informe o nome do item.";
    renderPage();
    return;
  }
  if (category === "skewer" && price === null) {
    state.error = "Informe um preço válido.";
    renderPage();
    return;
  }
  if (category === "side" && mediumPrice === null) {
    state.error = "Informe um preço médio válido.";
    renderPage();
    return;
  }
  if (category === "side" && largePriceText.trim() && largePrice === null) {
    state.error = "Informe um preço grande válido ou deixe o campo vazio.";
    renderPage();
    return;
  }

  let sortOrder = state.items.filter(function (item) {
    return item.category === category;
  }).length;

  const existingItem = state.items.find(function (item) {
    return item.id === itemId;
  });
  if (existingItem) {
    sortOrder = existingItem.sortOrder;
  }

  const item = {
    id: itemId,
    category: category,
    name: name,
    price: price,
    mediumPrice: mediumPrice,
    largePrice: largePrice,
    sortOrder: sortOrder,
  };

  state.savingId = itemId;
  state.error = "";
  state.message = "";
  renderPage();

  try {
    await salvarItem(item);
    state.addingCategory = "";
    state.message = `"${item.name}" foi salvo. As alterações já aparecem no cardápio.`;
  } catch (error) {
    state.error = `Não foi possível salvar "${item.name}": ${error.message}`;
  }

  state.savingId = "";
  renderPage();
}

async function handleDeleteItem(itemId) {
  const item = state.items.find(function (menuItem) {
    return menuItem.id === itemId;
  });

  if (!item || !window.confirm(`Excluir "${item.name}" do cardápio?`)) {
    return;
  }

  state.savingId = itemId;
  state.error = "";
  state.message = "";
  renderPage();

  try {
    await excluirItem(itemId);
    state.items = state.items.filter(function (menuItem) {
      return menuItem.id !== itemId;
    });
    state.message = `"${item.name}" foi removido do cardápio.`;
  } catch (error) {
    state.error = `Não foi possível excluir "${item.name}": ${error.message}`;
  }

  state.savingId = "";
  renderPage();
}

app.addEventListener("input", function (event) {
  if (event.target.name === "email") {
    state.email = event.target.value;
  }
});

app.addEventListener("submit", async function (event) {
  event.preventDefault();

  if (event.target.id === "login-form") {
    await handleLogin(event.target);
    return;
  }

  if (event.target.matches(".admin-item")) {
    await handleSaveItem(event.target);
  }
});

app.addEventListener("click", async function (event) {
  const addButton = event.target.closest("[data-add-category]");
  if (addButton) {
    state.addingCategory = addButton.dataset.addCategory;
    state.error = "";
    renderPage();
    return;
  }

  const signOutButton = event.target.closest('[data-action="sign-out"]');
  if (signOutButton) {
    try {
      await sair();
    } catch (error) {
      state.error = `Não foi possível sair: ${error.message}`;
      renderPage();
    }
    return;
  }

  const deleteButton = event.target.closest("[data-delete-id]");
  if (deleteButton) {
    await handleDeleteItem(deleteButton.dataset.deleteId);
  }
});

window.addEventListener("hashchange", renderPage);

renderPage();
startFirebaseListeners();
