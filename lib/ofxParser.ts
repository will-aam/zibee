export interface OFXTransaction {
  id: string;
  type: "Receita" | "Despesa";
  date: string;
  amount: number;
  description: string;
  fitid: string;
  categoryId?: string; // Pre-selecionado ou selecionado pelo user
  paymentMethodId?: string; 
}

export function parseOFX(ofxString: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(ofxString)) !== null) {
    const block = match[1];
    
    const extract = (tag: string) => {
      const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
      const res = block.match(regex);
      return res ? res[1].trim() : '';
    };

    const dtPosted = extract('DTPOSTED');
    const trnAmt = extract('TRNAMT');
    const fitid = extract('FITID');
    const memo = extract('MEMO');
    const name = extract('NAME');

    let date = '';
    if (dtPosted && dtPosted.length >= 8) {
      date = `${dtPosted.substring(0, 4)}-${dtPosted.substring(4, 6)}-${dtPosted.substring(6, 8)}`;
    }

    const amount = parseFloat(trnAmt);
    // Ignore invalid amounts
    if (isNaN(amount)) continue;

    const type = amount >= 0 ? 'Receita' : 'Despesa';
    
    // OFX do Inter costuma trazer no MEMO algo como 'Compra no debito: "estabelecimento"' e no NAME só o nome sujo
    // Vamos preferir o MEMO se for mais detalhado, ou o NAME se o MEMO for vazio
    let description = memo;
    if (memo.toLowerCase().includes('compra no debito') && name) {
        // Se for débito, o NAME geralmente tem o nome do local mais limpo ou sujo
        // O memo tem 'Compra no debito: "NOME"'
        const memoNameMatch = memo.match(/"([^"]+)"/);
        if (memoNameMatch) {
            description = memoNameMatch[1];
        } else {
            description = name;
        }
    } else if (!description) {
        description = name || 'Transação Desconhecida';
    }

    transactions.push({
      id: crypto.randomUUID(), // ID temporário para o front-end
      type,
      date,
      amount: Math.abs(amount),
      description,
      fitid
    });
  }

  // Ordenar por data mais antiga primeiro
  return transactions.sort((a, b) => a.date.localeCompare(b.date));
}
