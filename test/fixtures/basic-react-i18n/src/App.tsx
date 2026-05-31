export function App() {
  const title = t("checkout.payment.title");
  const save = t('common.save');
  const count = i18n.t("cart.items");
  return <button title={save}>{title}{count}</button>;
}
