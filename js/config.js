/*
 * Configuração central da landing page Noronha Pneus e Rodas.
 * Tudo que muda com frequência (contato, preços, oferta, IDs de anúncio) fica aqui.
 * Ao trocar o domínio, atualize também: index.html (canonical, og:url, JSON-LD), robots.txt, sitemap.xml e llms.txt.
 */
window.NORONHA = {
  // WhatsApp Business oficial ("Paulo - Noronha Pneus"), confirmado pelo link dos destaques do Instagram.
  // O número está registrado no WhatsApp no formato de 8 dígitos; não adicione o 9 aqui.
  whatsapp: '554991475797',
  telefoneExibicao: '(49) 99147-5797',
  instagram: 'https://www.instagram.com/noronha.pneus/',

  // Oferta Xbri Brutus T/A publicada em 05/10/2026: "válido até dia 30/10 ou até durar estoque".
  // Depois desta data, os preços da oferta somem da página e viram "Consulte o preço".
  ofertaXbriFim: '2026-10-30T23:59:59-03:00',

  // IDs de mídia paga. Deixe vazio o que ainda não existe; nada é carregado sem ID.
  tracking: {
    gtmId: '',            // ex.: 'GTM-XXXXXXX'
    ga4Id: '',            // ex.: 'G-XXXXXXXXXX' (use só se NÃO for configurar o GA4 pelo GTM)
    adsConversion: '',    // ex.: 'AW-123456789/AbCdEfGhIj' (conversão "Lead WhatsApp")
    metaPixelId: ''       // ex.: '123456789012345'
  }
};
