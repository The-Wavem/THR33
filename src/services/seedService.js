/**
 * Serviço de Seed de Dados
 * DESATIVADO: Todos os mocks de catálogo foram removidos para permitir
 * apenas produtos reais criados organicamente pelo CMS administrativo.
 */

export const seedService = {
  /**
   * Não executa mais seed automático de produtos fictícios no Firestore.
   * Retorna contagem zerada para manter compatibilidade com eventuais chamadas legadas.
   */
  async seedCatalogIfEmpty() {
    return { seeded: false, count: 0 };
  }
};

export default seedService;
