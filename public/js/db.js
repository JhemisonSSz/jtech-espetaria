// db.js — Único arquivo que conversa com o Firebase (banco Firestore e login).
// O main.js só chama as funções daqui, com nomes em português.
// O Firebase vem direto do CDN do Google: não precisa de npm nem de build.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Só liga o Firebase se o firebase-config.js estiver preenchido
export const firebaseConfigured = ["apiKey", "authDomain", "projectId", "appId"]
  .every((campo) => firebaseConfig[campo] && !String(firebaseConfig[campo]).startsWith("COLE"));

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Todos os itens do cardápio ficam na coleção "menu_items"
const COLECAO = "menu_items";

// Só os campos que as regras do Firestore aceitam
const dadosDoItem = (item) => ({
  category: item.category,
  name: item.name,
  price: item.price,
  mediumPrice: item.mediumPrice,
  largePrice: item.largePrice,
  sortOrder: item.sortOrder,
});

// ---- Cardápio ----

// Fica "escutando" o cardápio: chama aoMudar(itens, vazio) sempre que algo muda no banco.
// Devolve uma função que para de escutar.
export function ouvirCardapio(aoMudar, aoErro) {
  const consulta = query(collection(db, COLECAO), orderBy("sortOrder"));
  return onSnapshot(
    consulta,
    (snapshot) => aoMudar(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })), snapshot.empty),
    aoErro,
  );
}

// Grava os itens de exemplo de uma vez (usado quando o cardápio está vazio)
export async function gravarItensIniciais(itens) {
  const lote = writeBatch(db);
  itens.forEach((item) => lote.set(doc(db, COLECAO, item.id), dadosDoItem(item)));
  await lote.commit();
}

// Salva um item. Se o id começa com "new-", é um item novo e o Firebase cria o id.
export async function salvarItem(item) {
  const referencia = item.id.startsWith("new-") ? doc(collection(db, COLECAO)) : doc(db, COLECAO, item.id);
  await setDoc(referencia, dadosDoItem(item));
}

export async function excluirItem(id) {
  await deleteDoc(doc(db, COLECAO, id));
}

// ---- Login do administrador ----

export function aoMudarLogin(aoMudar, aoErro) {
  return onAuthStateChanged(auth, aoMudar, aoErro);
}

export function entrar(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export function sair() {
  return signOut(auth);
}
