let phoneMask;
let editPhoneMask;
let contactList = [];

window.onload = () => {
  initializeDB();
  listContactsUI();
  makePhoneMaskUI();
};

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

function getAllContactsDB() {
  return alasql("SELECT * FROM contacts");
}

function deleteContactDB(contactId) {
  alasql("DELETE FROM contacts WHERE id = ?", [contactId]);
}

function addContactDB({ name, phone, email, imageUrl }) {
  alasql(
    "INSERT INTO contacts (name, phone, email, imageUrl) VALUES (?, ?, ?, ?)",
    [name, phone, email, imageUrl]
  );
}

function editContactDB({ name, phone, email, id }) {
  alasql(
    "UPDATE contacts SET name = ?, phone = ?, email = ? WHERE id = ?",
    [name, phone, email, id]
  );
}

function makeEditPhoneMaskUI() {
  const { phoneInput } = getInputFieldsUI('edit-')

  editPhoneMask = IMask(phoneInput, { mask: '(00) 00000-0000' })

  phoneInput.addEventListener('input', () => {
    editPhoneMask.updateValue()
  })
}

function makePhoneMaskUI() {
  const { phoneInput } = getInputFieldsUI()

  phoneMask = IMask(phoneInput, { mask: '(00) 00000-0000' })

  phoneInput.addEventListener('input', () => {
    phoneMask.updateValue()
  })
}

function getInputFieldsUI(prefix = '') {
  return {
    nameInput: document.getElementById(prefix + "name"),
    phoneInput: document.getElementById(prefix + "phone"),
    emailInput: document.getElementById(prefix + "email"),
  }
}

function clearInputFieldsUI() {
  const { nameInput, emailInput, phoneInput } = getInputFieldsUI()

  nameInput.value = ''
  emailInput.value = ''
  phoneInput.value = ''
}

function validateField(inputElement, errorElement, validateFunction, errorMessage) {
  if (validateFunction(inputElement.value)) {
    errorElement.innerHTML = ''
    return true
  } else {
    errorElement.innerHTML = `<span class="material-symbols-outlined">error</span> ${errorMessage}`
    return false
  }
}

function validateInputFields(inputsElements, errorElementsIds) {
  const isNameValid = validateField(
    inputsElements.nameInput,
    document.getElementById(errorElementsIds.nameError),
    (value) => value.trim().length >= 3,
    'O nome deve ter pelo menos 3 caracteres.'
  )

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = validateField(
    inputsElements.emailInput,
    document.getElementById(errorElementsIds.emailError),
    (value) => value.trim() && emailRegex.test(value),
    'O e-mail eh obrigatorio e deve ser valido.'
  )

  const mask = errorElementsIds.phoneError === 'edit-phone-error' ? editPhoneMask : phoneMask;

  const isPhoneValid = validateField(
    inputsElements.phoneInput,
    document.getElementById(errorElementsIds.phoneError),
    (value) => value.trim() && mask.masked.isComplete,
    'O telefone eh obrigatorio e deve ser valido'
  )

  return isNameValid && isEmailValid && isPhoneValid
}

function addContactUI(event) {
  event.preventDefault();
  const { nameInput, emailInput, phoneInput } = getInputFieldsUI()

  const isFormValid = validateInputFields(
    { nameInput, emailInput, phoneInput },
    {
      nameError: 'name-error',
      emailError: 'email-error',
      phoneError: 'phone-error'
    }
  )

  if (!isFormValid) {
    return
  }

  const imageUrl = `https://i.pravatar.cc/50?u=${emailInput.value}`

  addContactDB({
    name: nameInput.value,
    phone: phoneInput.value,
    email: emailInput.value,
    imageUrl
  })
  listContactsUI();
  clearInputFieldsUI();
  nameInput.focus();
  Swal.fire({
    title: "Sucesso!",
    text: "O contato foi adicionado!",
    icon: "success",
  });
}

function listContactsUI() {
  const contacts = getAllContactsDB();

  const contactListElement = document.getElementById("contact-list");

  if (contacts.length === 0) {
    contactListElement.innerHTML = `
    <span>Nenhum contato encontrado, sua agenda esta vazia</span>
    `;
    return;
  }

  contactList = contacts.map((contact, index) => {
    contact.isEditing = contactList[index]?.isEditing
    return contact
  })

  contactListElement.innerHTML = contactList
    .map((contact) => contactTemplateUI(contact))
    .join("");
}

function resetAllContactsEditing() {
  contactList = contactList.map(contact => contact.isEditing = false)
}

function deleteContactUI(contactId) {
  resetAllContactsEditing();
  deleteContactDB(contactId);
  listContactsUI();
  Swal.fire({
    title: "Sucesso!",
    text: "O contato foi removido!",
    icon: "success",
  });
}

function setIsContactEditing(contactId, isEditing) {
  contactList = contactList.map((contact) => {
    if (contact.id === contactId) {
      contact.isEditing = isEditing
    }
    return contact
  })
}

function editContactFormUI(event, contactId) {
  event.preventDefault();
  const contact = contactList.find(contact => contact.id === contactId)
  if (contact.isEditing) {
    const { nameInput, phoneInput, emailInput } = getInputFieldsUI('edit-')
    const isFormValid = validateInputFields({
      nameInput, phoneInput, emailInput,
    }, {
      nameError: 'edit-name-error',
      emailError: 'edit-email-error',
      phoneError: 'edit-phone-error',
    })

    if (!isFormValid) return

    editContactDB({
      name: nameInput.value,
      phone: phoneInput.value,
      email: emailInput.value,
      id: contactId
    })

    Swal.fire({
      title: "Sucesso!",
      text: "O contato foi atualizado!",
      icon: "success",
    });
  }
  const isSomeContactBeingEdited = contactList.some(contact => contact.id !== contactId && contact.isEditing)

  if (isSomeContactBeingEdited) {
    Swal.fire({
      title: "Ops!",
      text: "Voce ja esta editando outro contato!",
      icon: "error",
    });
    return
  }

  setIsContactEditing(contactId, !contact.isEditing);
  listContactsUI();
  fillEditInputFields(contact);
  makeEditPhoneMaskUI();
}

function fillEditInputFields(contact) {
  const { nameInput, emailInput, phoneInput } = getInputFieldsUI('edit-')

  nameInput.value = contact.name
  emailInput.value = contact.email
  phoneInput.value = contact.phone
}

function displayEditContactSection() {
  return `
<div id="contact-edit">
    <input type="text" id="edit-name" name="name" placeholder="Nome" />
    <span id="edit-name-error" class="error"></span>
    <input type="text" id="edit-phone" name="phone" placeholder="Telefone" />
    <span id="edit-phone-error" class="error"></span>
    <input type="text" id="edit-email" name="email" placeholder="E-mail" />
    <span id="edit-email-error" class="error"></span>
</div>
`
}

function getEditButtonContent(isEditing) {
  const editingContent = `
    Editar
    <span class="material-symbols-outlined"> edit </span>
  `;
  const savingContent = `
    Salvar
    <span class="material-symbols-outlined"> save </span>
  `;

  return isEditing ? savingContent : editingContent;
}

function contactTemplateUI(contact) {
  return `
      <li>
        <div id="contact-avatar">
          <img
            src="${contact.imageUrl}"
            alt="${contact.name}"
          />
        </div>
        <div id="contact-info">
          <span>${contact.name}</span>
          <span>${contact.phone}</span>
          <span>${contact.email}</span>
        </div>
        <form id="edit-contact" onsubmit="editContactFormUI(event, ${contact.id})">
          <div id="edit-buttons">
            <button type="submit">
              ${getEditButtonContent(contact.isEditing)}
            </button>
            <button type="button" onclick="deleteContactUI(${contact.id})">
              Excluir
              <span class="material-symbols-outlined"> delete </span>
            </button>
          </div>
          ${contact.isEditing ? displayEditContactSection() : ""}
        </form>
      </li>
      <div id="divider"></div>
    `;
}

// TODO: only show edit when user is editing
function editContactSessionUI() {
  return `
        <div id="contact-edit">
            <input
                type="text"
                id="edit-name"
                name="edit-name"
                placeholder="Nome"
            />
            <span id="edit-name-error" class="error-edit">
            <span class="material-symbols-outlined"> error </span>
            Campo inválido
            </span>
            <input
                type="text"
                id="edit-phone"
                name="edit-phone"
                placeholder="Telefone"
            />
            <span id="edit-phone-error" class="error-edit"></span>
            <input
                type="text"
                id="edit-email"
                name="edit-email"
                placeholder="E-mail"
            />
            <span id="edit-email-error" class="error-edit"></span>
        </div>
    `;
}
