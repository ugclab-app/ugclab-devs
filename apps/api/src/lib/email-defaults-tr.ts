import type { EmailTemplate } from "./transactional-email.js";

/** Turkish defaults for transactional + merchant order emails. */
export const DEFAULTS_TR: Record<string, EmailTemplate> = {
  shipping: {
    subject: "#{{orderNumber}} numaralı siparişiniz kargoya verildi",
    html: `<p>Merhaba{{name}},</p><p>{{storeName}} mağazasından <strong>#{{orderNumber}}</strong> numaralı siparişiniz yolda.</p><p>Takip: <strong>{{tracking}}</strong></p><p><a href="{{url}}">Siparişi görüntüle</a></p>`,
  },
  pickupReady: {
    subject: "#{{orderNumber}} numaralı sipariş teslime hazır",
    html: `<p><strong>#{{orderNumber}}</strong> numaralı siparişiniz teslime hazır{{place}}.</p><p>{{address}}</p><p>{{instructions}}</p><p>{{hours}}</p>`,
  },
  passwordReset: {
    subject: "{{storeName}} şifrenizi sıfırlayın",
    html: `<p>{{storeName}} için yeni bir şifre belirleyin.</p><p><a href="{{url}}">Şifreyi sıfırla</a></p><p>Bu bağlantı bir saat içinde geçerliliğini yitirir.</p>`,
  },
  abandonedCart: {
    subject: "Sepetinizde ürünler kaldı — {{storeName}}",
    html: `<h2>Siparişinizi tamamlayın</h2><p><strong>{{storeName}}</strong> mağazasında ürünleriniz sizi bekliyor.</p><p>Sepet tutarı: {{total}}</p><p><a href="{{url}}">Sepete dön</a></p>`,
  },
  orderCancelled: {
    subject: "#{{orderNumber}} numaralı sipariş iptal edildi",
    html: `<p>{{storeName}} mağazasındaki <strong>#{{orderNumber}}</strong> numaralı siparişiniz iptal edildi.</p><p>{{reason}}</p>`,
  },
  orderRefunded: {
    subject: "#{{orderNumber}} numaralı sipariş için iade",
    html: `<p>{{storeName}}, <strong>#{{orderNumber}}</strong> numaralı sipariş için <strong>{{amount}}</strong> tutarını iade etti.</p><p>{{reason}}</p>`,
  },
  returnRequested: {
    subject: "{{rma}} iade talebinizi aldık",
    html: `<p><strong>#{{orderNumber}}</strong> numaralı sipariş için <strong>{{rma}}</strong> iade talebiniz inceleniyor.</p>`,
  },
  returnUpdate: {
    subject: "{{rma}} iade durumu: {{status}}",
    html: `<p><strong>#{{orderNumber}}</strong> numaralı sipariş için <strong>{{rma}}</strong> iade talebinin durumu artık <strong>{{status}}</strong>.</p><p>{{note}}</p>`,
  },
  reviewRequest: {
    subject: "#{{orderNumber}} numaralı siparişiniz nasıldı?",
    html: `<p>{{storeName}} mağazasından <strong>#{{orderNumber}}</strong> numaralı siparişiniz tamamlandı.</p><p><a href="{{url}}">Yorum bırakın</a></p>`,
  },
  subscriptionStarted: {
    subject: "Abonelik başladı — {{product}}",
    html: `<p>{{storeName}} mağazasında <strong>{{product}}</strong> aboneliğiniz aktif.</p><p>Sonraki yenileme: {{renewsAt}}</p>`,
  },
  subscriptionRenewed: {
    subject: "Abonelik yenilendi — {{product}}",
    html: `<p><strong>{{product}}</strong> aboneliğiniz yenilendi.</p><p>Sonraki yenileme: {{renewsAt}}</p>`,
  },
  subscriptionCancelled: {
    subject: "Abonelik iptal edildi — {{product}}",
    html: `<p>{{storeName}} mağazasındaki <strong>{{product}}</strong> aboneliğiniz iptal edildi. Tekrar ücret alınmayacak.</p>`,
  },
  subscriptionFailed: {
    subject: "{{product}} için ödeme başarısız",
    html: `<p><strong>{{product}}</strong> için kartınızdan tahsilat yapılamadı. Erişimi korumak için ödeme yönteminizi güncelleyin.</p>`,
  },
  merchantPending: {
    subject: "Yeni ödenmemiş sipariş #{{orderNumber}} — {{total}}",
    html: `<h2>Ödeme bekleyen sipariş</h2><p><strong>Sipariş:</strong> #{{orderNumber}}</p><p><strong>Müşteri:</strong> {{customer}}</p><p><strong>Toplam:</strong> {{total}}</p><p><strong>Ürünler:</strong><br/>{{items}}</p><p><a href="{{url}}">Yönetim panelinde gör</a></p>`,
  },
  merchantPaid: {
    subject: "Yeni sipariş #{{orderNumber}} — {{total}}",
    html: `<h2>Yeni sipariş alındı</h2><p><strong>Sipariş:</strong> #{{orderNumber}}</p><p><strong>Durum:</strong> {{status}}</p><p><strong>Müşteri:</strong> {{customer}}</p><p><strong>Toplam:</strong> {{total}}</p><p><strong>Ürünler:</strong><br/>{{items}}</p><p><a href="{{url}}">Yönetim panelinde gör</a></p>`,
  },
  merchantRefund: {
    subject: "#{{orderNumber}} numaralı siparişte iade",
    html: `<p><strong>#{{orderNumber}}</strong> numaralı sipariş iade edildi ({{amount}}).</p><p>{{reason}}</p><p><a href="{{url}}">Yönetim panelinde gör</a></p>`,
  },
  merchantReturn: {
    subject: "#{{orderNumber}} siparişinde iade talebi {{rma}}",
    html: `<p>Müşteri <strong>#{{orderNumber}}</strong> numaralı sipariş için <strong>{{rma}}</strong> iade talebi oluşturdu.</p><p>{{reason}}</p><p><a href="{{url}}">Yönetim panelinde gör</a></p>`,
  },
  merchantDispute: {
    subject: "#{{orderNumber}} numaralı siparişte ödeme itirazı",
    html: `<p><strong>#{{orderNumber}}</strong> numaralı siparişte kart itirazı açıldı.</p><p>Durum: {{status}}. Neden: {{reason}}.</p><p><a href="{{url}}">Yönetim panelinde gör</a></p>`,
  },
  receipt: {
    subject: "#{{orderNumber}} numaralı sipariş makbuzu — {{storeName}}",
    html: `<h2>Siparişiniz için teşekkürler</h2><p><strong>Mağaza:</strong> {{storeName}}</p><p><strong>Sipariş:</strong> #{{orderNumber}}</p><p><strong>Durum:</strong> {{status}}</p><p><strong>Ürünler:</strong><br/>{{items}}</p><p><strong>Toplam:</strong> {{total}}</p>{{downloads}}`,
  },
};
