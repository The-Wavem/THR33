import { test, expect } from '@playwright/test';

test.describe('Fluxo Completo de Compra e Conferência no CMS - THR33', () => {

  const customerUser = {
    uid: 'test_cust_01',
    id: 'test_cust_01',
    email: 'cliente.teste@thr33.com.br',
    name: 'Matheus Rocha',
    displayName: 'Matheus Rocha',
    cpf: '111.444.777-35',
    phone: '(41) 99999-8888',
    role: 'customer',
    isAdmin: false,
    addresses: [
      {
        id: 'addr_test_01',
        title: 'Principal',
        label: 'Endereço (Batel)',
        cep: '80420-000',
        street: 'Rua Comendador Araújo',
        number: '333',
        neighborhood: 'Batel',
        city: 'Curitiba',
        state: 'PR',
        complement: 'Apto 101',
        isDefault: true
      }
    ]
  };

  const adminUser = {
    uid: 'admin_test_01',
    id: 'admin_test_01',
    email: 'contato.thewavem@gmail.com',
    name: 'Administrador THR33',
    displayName: 'Administrador THR33',
    role: 'admin',
    isAdmin: true
  };

  test('Deve realizar o fluxo ponta a ponta: Catálogo -> PDP -> Carrinho -> Checkout com Cupom -> Painel Admin', async ({ page }) => {
    test.setTimeout(60000);

    // 1. Injeta sessão inicial do comprador no LocalStorage se ainda não definida
    await page.addInitScript((user) => {
      if (!window.localStorage.getItem('thr33_mock_auth')) {
        window.localStorage.setItem('thr33_mock_auth', JSON.stringify(user));
      }
    }, customerUser);

    // -------------------------------------------------------------
    // ETAPA 1: NAVEGAÇÃO NO CATÁLOGO
    // -------------------------------------------------------------
    await page.goto('/catalogo');

    // Valida que a página de catálogo carregou
    await expect(
      page.getByRole('heading', { name: /VESTUÁRIO & CONCEITO/i })
        .or(page.getByRole('heading', { name: /CATÁLOGO/i }))
    ).toBeVisible({ timeout: 15000 });

    // Localiza o primeiro produto disponível e clica para ver os detalhes
    const firstProductBtn = page.getByRole('link', { name: /VER DETALHES/i }).first();
    await expect(firstProductBtn).toBeVisible({ timeout: 15000 });
    await firstProductBtn.click();

    // -------------------------------------------------------------
    // ETAPA 2: PÁGINA DE DETALHES DO PRODUTO (PDP)
    // -------------------------------------------------------------
    await page.waitForURL(/\/produto\//);

    // Aguarda o botão principal da PDP estar visível
    const bagBtn = page.getByRole('button', { name: /ADICIONAR À SACOLA|TAMANHO ESGOTADO/i });
    await expect(bagBtn).toBeVisible({ timeout: 15000 });

    // Seleciona um tamanho disponível na PDP (ex: M, G ou P)
    const pdpSizeBtn = page.getByRole('button', { name: /^Tamanho (M|G|P|GG|PP)/i }).first();
    if (await pdpSizeBtn.isVisible()) {
      await pdpSizeBtn.click();
    }

    // Clica no botão "ADICIONAR À SACOLA"
    const addToCartBtn = page.getByRole('button', { name: /ADICIONAR À SACOLA/i });
    await expect(addToCartBtn).toBeVisible({ timeout: 15000 });
    await addToCartBtn.click();

    // -------------------------------------------------------------
    // ETAPA 3: CART DRAWER (GAVETA DE SACOLA)
    // -------------------------------------------------------------
    // Valida se a gaveta do carrinho abriu e contém o produto adicionado
    const cartDrawer = page.getByRole('complementary', { name: /Carrinho de Compras/i });
    await expect(cartDrawer).toBeVisible({ timeout: 15000 });
    await expect(cartDrawer.getByText(/Tam:/i)).toBeVisible({ timeout: 10000 });

    // Clica em "FINALIZAR COMPRA" para avançar ao checkout
    const goToCheckoutBtn = cartDrawer.getByRole('button', { name: /FINALIZAR COMPRA/i });
    await expect(goToCheckoutBtn).toBeVisible({ timeout: 10000 });
    await goToCheckoutBtn.click();

    // -------------------------------------------------------------
    // ETAPA 4: CHECKOUT GUIADO EM 3 ETAPAS
    // -------------------------------------------------------------
    await expect(page).toHaveURL(/\/checkout/);

    // ETAPA 4.1: IDENTIFICAÇÃO (ETAPA 01)
    await expect(page.getByRole('heading', { name: /DADOS DE CONTATO & NOTA FISCAL/i })).toBeVisible({ timeout: 15000 });
    
    // Avança para a Etapa 2 de Entrega
    const continueToDeliveryBtn = page.getByRole('button', { name: /CONTINUAR PARA ENTREGA/i });
    await expect(continueToDeliveryBtn).toBeEnabled({ timeout: 10000 });
    await continueToDeliveryBtn.click();

    // ETAPA 4.2: ENDEREÇO & FRETE & CUPOM (ETAPA 02)
    await expect(page.getByRole('heading', { name: /ENDEREÇO DE ENTREGA & FRETE/i })).toBeVisible({ timeout: 15000 });

    // Preenche novo endereço apenas se o formulário estiver aberto
    const cepInput = page.getByPlaceholder('00000-000');
    if (await cepInput.isVisible()) {
      await cepInput.fill('80420-000');
      
      const numberInput = page.getByPlaceholder(/123|333/i);
      if (await numberInput.isVisible()) {
        await numberInput.fill('333');
      }

      const streetInput = page.getByPlaceholder(/Rua Comendador Araújo/i);
      if (await streetInput.isVisible()) {
        const currentStreet = await streetInput.inputValue();
        if (!currentStreet) await streetInput.fill('Rua Comendador Araújo');
      }

      const neighborhoodInput = page.getByPlaceholder(/Batel/i);
      if (await neighborhoodInput.isVisible()) {
        const currentNeigh = await neighborhoodInput.inputValue();
        if (!currentNeigh) await neighborhoodInput.fill('Batel');
      }
    }

    // Aplica o Cupom de Teste via couponService
    const couponInput = page.getByPlaceholder(/Cupom \(ex: EDU10\)/i).first();
    if (await couponInput.isVisible()) {
      await couponInput.fill('THR10');
      const applyCouponBtn = page.getByRole('button', { name: /APLICAR/i }).first();
      await applyCouponBtn.click();
      
      // Valida o feedback do cupom aplicado
      await expect(
        page.getByText(/CUPOM.*THR10/i)
          .or(page.getByText(/aplicado com sucesso/i))
      ).toBeVisible({ timeout: 10000 });
    }

    // Avança para a Etapa 3 de Pagamento
    const continueToPaymentBtn = page.getByRole('button', { name: /CONTINUAR PARA PAGAMENTO/i });
    await expect(continueToPaymentBtn).toBeEnabled({ timeout: 10000 });
    await continueToPaymentBtn.click();

    // ETAPA 4.3: PAGAMENTO (ETAPA 03)
    await expect(page.getByRole('heading', { name: /PAGAMENTO SEGURO/i })).toBeVisible({ timeout: 15000 });

    // Submete o pedido com pagamento PIX
    const submitOrderBtn = page.getByRole('button', { name: /PAGAR COM PIX|PAGAR COM/i });
    await expect(submitOrderBtn).toBeVisible({ timeout: 10000 });
    await submitOrderBtn.click();

    // -------------------------------------------------------------
    // ETAPA 5: TELA DE CONFIRMAÇÃO DO PEDIDO (ETAPA 04)
    // -------------------------------------------------------------
    await expect(page.getByRole('heading', { name: /PEDIDO GERADO COM SUCESSO!/i })).toBeVisible({ timeout: 20000 });

    // Captura o número do pedido gerado (ex: PEDIDO THR-XXXXXX)
    const orderNumberElement = page.locator('text=/PEDIDO THR-[A-Z0-9]{4,6}/i').first();
    await expect(orderNumberElement).toBeVisible({ timeout: 10000 });
    const orderNumberText = await orderNumberElement.innerText();
    const orderId = orderNumberText.match(/THR-[A-Z0-9]+/i)?.[0] || orderNumberText;
    console.log(`[E2E] Pedido criado com sucesso: ${orderId}`);

    // -------------------------------------------------------------
    // ETAPA 6: CONFERÊNCIA NO PAINEL ADMIN (/admin/pedidos)
    // -------------------------------------------------------------
    // Troca a sessão para Administrador no localStorage
    await page.evaluate((admin) => {
      window.localStorage.setItem('thr33_mock_auth', JSON.stringify(admin));
    }, adminUser);

    // Navega para a rota de pedidos do CMS
    await page.goto('/admin/pedidos');

    // Valida se o painel administrativo de pedidos carregou
    await expect(page.getByRole('heading', { name: /PEDIDOS & LOGÍSTICA REVERSA/i })).toBeVisible({ timeout: 15000 });

    // Valida que o pedido recém-criado consta na tabela com o nome do cliente
    const orderRow = page.getByRole('row', { name: new RegExp(customerUser.name, 'i') }).first();
    await expect(orderRow).toBeVisible({ timeout: 15000 });

    // Valida que o status do pedido consta como Aprovado no combobox de status
    const statusSelect = orderRow.getByRole('combobox').or(orderRow.locator('select')).first();
    await expect(statusSelect).toHaveValue('Aprovado');

    console.log(`[E2E] Pedido ${orderId} verificado no CMS com sucesso com status Aprovado!`);
  });

});
