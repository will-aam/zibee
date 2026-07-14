import CreditCardsClient from "./_components/CreditCardsClient";

export default function CreditCards() {
  console.log("--- DEBUG PAGE.TSX ---");
  console.log("CreditCardsClient:", typeof CreditCardsClient);
  console.log("------------------------");
  return <CreditCardsClient />;
}
