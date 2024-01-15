let contactsListState = [];
let phoneMask;
let phoneEditMask;

window.onload = () => {
  initializeDB();
  displayContactsUI();
  makePhoneMaskUI();
};

function makePhoneMaskUI() {
  const { phoneInput } = getInputFieldsUI();

  const phoneMaskConfig = { mask: "(00) 00000-0000", lazy: false };

  phoneMask = IMask(phoneInput, phoneMaskConfig);

  phoneInput.addEventListener("input", () => {
    phoneMask.updateValue();
  });
}

function getInputFieldsUI(prefix = "") {
  return {
    nameInput: document.getElementById(prefix + "name"),
    phoneInput: document.getElementById(prefix + "phone"),
    emailInput: document.getElementById(prefix + "email"),
  };
}

function validateField(
  inputElement,
  errorElement,
  validateFunction,
  errorMessage
) {
  if (validateFunction(inputElement.value)) {
    errorElement.innerHTML = "";
    return true;
  } else {
    errorElement.innerHTML = `<span class="material-symbols-outlined">error</span>${errorMessage}`;
    return false;
  }
}

function validateFieldsUI(textInputElements, errorElementsIds, phoneMask) {
  const nameIsValid = validateField(
    textInputElements.nameInput,
    document.getElementById(errorElementsIds.nameError),
    (value) => value.trim() && value.trim().length >= 3,
    "Nome deve ter pelo menos 3 caracteres"
  );

  const phoneIsValid = validateField(
    textInputElements.phoneInput,
    document.getElementById(errorElementsIds.phoneError),
    (value) => value.trim() && phoneMask.masked.isComplete,
    "Telefone é obrigatório e deve ser válido"
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIsValid = validateField(
    textInputElements.emailInput,
    document.getElementById(errorElementsIds.emailError),
    (value) => value.trim() && emailRegex.test(value),
    "Email é obrigatório e deve ser válido"
  );

  return nameIsValid && phoneIsValid && emailIsValid;
}

function initializeDB() {
  alasql("CREATE LOCALSTORAGE DATABASE IF NOT EXISTS ContactDB");
  alasql("ATTACH LOCALSTORAGE DATABASE ContactDB");
  alasql("USE ContactDB");
  alasql(`CREATE TABLE IF NOT EXISTS contacts (
            id INT AUTO_INCREMENT,
            name STRING,
            phone STRING,
            email STRING,
            imageUrl STRING
        )`);
}

function deleteContactDB(id) {
  alasql("DELETE FROM contacts WHERE id = ?", [id]);
}

function insertContactDB({ name, phone, email, imageUrl }) {
  alasql(
    "INSERT INTO contacts (name, phone, email, imageUrl) VALUES (?, ?, ?, ?)",
    [name, phone, email, imageUrl]
  );
}

function getAllContactsDB() {
  return alasql("SELECT * FROM contacts ORDER BY id DESC");
}

function editContactDB({ id, name, phone, email }) {
  alasql("UPDATE contacts SET name = ?, phone = ?, email = ? WHERE id = ?", [
    name,
    phone,
    email,
    id,
  ]);
}

function addContactUI() {
  const { nameInput, phoneInput, emailInput } = getInputFieldsUI();

  const isFormValid = validateFieldsUI(
    { nameInput, phoneInput, emailInput },
    {
      nameError: "name-error",
      phoneError: "phone-error",
      emailError: "email-error",
    },
    phoneMask
  );

  if (!isFormValid) {
    focusFirstInvalidInputFromSelector("error");
    return;
  }

  const imageUrl = `https://i.pravatar.cc/50?u=${emailInput.value}`;

  insertContactDB({
    name: nameInput.value,
    phone: phoneInput.value,
    email: emailInput.value,
    imageUrl,
  });
  displayContactsUI();
  clearFormUI();
  nameInput.focus();
  Swal.fire({
    title: "Sucesso!",
    text: "Um novo contato foi adicionado!",
    icon: "success",
  });
}

function deleteContactUI(id) {
  deleteContactDB(id);
  exitEditModeForAllContactsUI();
  displayContactsUI();
  Swal.fire({
    title: "Sucesso!",
    text: `O contato foi excluído!`,
    icon: "success",
  });
}

function clearFormUI() {
  const { nameInput, phoneInput, emailInput } = getInputFieldsUI();
  nameInput.value = "";
  phoneInput.value = "";
  emailInput.value = "";
}

function displayContactsUI() {
  const contactsDB = getAllContactsDB();

  contactsListState = contactsDB.map((contact, index) => {
    contact.isEditing = contactsListState[index]?.isEditing;
    return contact;
  });

  var contactListElement = document.getElementById("contact-list");
  contactListElement.innerHTML = contactsListState
    .map((contact) => contactTemplateUI(contact))
    .join("");
}

function setContactIsEditing(id, isEditing) {
  contactsListState = contactsListState.map((contact) => {
    if (contact.id === id) {
      contact.isEditing = isEditing;
    }
    return contact;
  });
}

function exitEditModeForAllContactsUI() {
  contactsListState = contactsListState.map((contact) => {
    contact.isEditing = false;
    return contact;
  });
}

function enterEditModeUI(id) {
  const isEditing = contactsListState.some((contact) => contact.isEditing);
  if (isEditing) {
    Swal.fire({
      title: "Ops!",
      text: "Você já está editando um contato! Finalize a edição para continuar.",
      icon: "error",
    });
    return;
  }

  setContactIsEditing(id, true);
  displayContactsUI();
  makePhoneMaskUI(phoneEditMask, document.getElementById("edit-phone"));
}

function makePhoneEditMaskUI() {
  var phoneEditInput = document.getElementById("edit-phone");

  const phoneMaskConfig = { mask: "(00) 00000-0000", lazy: false };

  phoneEditMask = IMask(phoneEditInput, phoneMaskConfig);

  phoneEditInput.addEventListener("input", () => {
    phoneEditMask.updateValue();
  });
}

function editContactUI(id) {
  const { nameInput, phoneInput, emailInput } = getInputFieldsUI("edit-");

  makePhoneEditMaskUI();

  const isFormValid = validateFieldsUI(
    { nameInput, phoneInput, emailInput },
    {
      nameError: "edit-name-error",
      phoneError: "edit-phone-error",
      emailError: "edit-email-error",
    },
    phoneEditMask
  );

  if (!isFormValid) {
    focusFirstInvalidInputFromSelector("error-edit");
    return;
  }

  editContactDB({
    id,
    name: nameInput.value,
    phone: phoneInput.value,
    email: emailInput.value,
  });
  setContactIsEditing(id, false);
  displayContactsUI();

  Swal.fire({
    title: "Sucesso!",
    text: `O contato "${nameInput.value}" foi editado!`,
    icon: "success",
  });
}

function focusFirstInvalidInputFromSelector(selector) {
  const firstErrorElement = document.querySelector(`.${selector}:not(:empty)`);
  firstErrorElement.previousElementSibling.focus();
}

function contactTemplateUI(contact) {
  return `
        <li>
            <div id="contact-avatar">
                <img src="${contact.imageUrl}" alt="${contact.name}" />
            </div>
            <div id="contact-info">
                <span>${contact.name}</span>
                <span>${contact.phone}</span>
                <span>${contact.email}</span>
            </div>
            <form id="edit-contact" onsubmit="submitForm(event, ${
              contact.id
            });">
                <div id="edit-buttons">
                    <button type="submit">
                        ${getEditButtonLabel(contact)}
                        ${getEditButtonIcon(contact)}
                    </button>
                    <button type="button" onclick="deleteContactUI(${
                      contact.id
                    })">
                        Excluir 
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
                ${contact.isEditing ? getContactEditSection(contact) : ""}
        </li>
            </form>
        <div id="divider"></div>
    `;
}

function submitForm(event, id) {
  event.preventDefault();

  const foundContact = contactsListState.find((contact) => contact.id === id);

  foundContact.isEditing
    ? editContactUI(foundContact.id)
    : enterEditModeUI(foundContact.id);
}

function getEditButtonLabel(contact) {
  return contact.isEditing ? "Salvar" : "Editar";
}

function getEditButtonIcon(contact) {
  return contact.isEditing
    ? `<span class="material-symbols-outlined">save</span>`
    : `<span class="material-symbols-outlined">edit</span>`;
}

function getContactEditSection(contact) {
  return `
        <div id="contact-edit">
                <input type="text" id="edit-name" placeholder="Nome" value="${contact.name}" />
                <span id="edit-name-error" class="error-edit"></span>
                <input type="text" id="edit-phone" placeholder="Telefone" value="${contact.phone}" />
                <span id="edit-phone-error" class="error-edit"></span>
                <input type="text" id="edit-email" placeholder="E-mail" value="${contact.email}" />
                <span id="edit-email-error" class="error-edit"></span>
        </div>
    `;
}
