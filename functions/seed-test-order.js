/**
 * Script utilitario para popular o pedido de teste no Firestore Emulator
 * Cria o documento PEDIDO-TESTE-101 em 'orders' e 'pedidos' com status inicial 'pendente'.
 */
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'thr33-streetwear' });
}

const db = admin.firestore();

async function seed() {
  const orderId = 'PEDIDO-TESTE-101';
  const orderData = {
    orderId,
    clientName: 'Cliente Teste',
    clientEmail: 'cliente@teste.com',
    clientCpf: '12345678909',
    status: 'pendente',
    total: 159.90,
    amountInCents: 15990,
    items: [
      {
        id: 'PROD-001',
        reference_id: 'PROD-001',
        name: 'Camiseta Oversized Minimal',
        quantity: 1,
        unit_amount: 15990,
        price: 159.90
      }
    ],
    paymentMethod: 'PIX',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  await db.collection('orders').doc(orderId).set(orderData, { merge: true });
  await db.collection('pedidos').doc(orderId).set(orderData, { merge: true });

  console.log(`Documento ${orderId} criado com sucesso em 'orders' e 'pedidos' com status inicial 'pendente'!`);
  await admin.app().delete();
}

seed().catch(async (err) => {
  console.error('Erro ao semear pedido de teste:', err);
  try {
    await admin.app().delete();
  } catch (e) {}
  process.exit(1);
});
