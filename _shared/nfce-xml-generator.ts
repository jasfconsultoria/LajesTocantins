const pad = (num: number, size: number): string => {
    let s = String(num);
    while (s.length < size) s = "0" + s;
    return s;
}

const sha1 = async (str: string): Promise<string> => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const sanitize = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: return match;
        }
    });
};


export const generateXmlForNfce = async (
    order: any, 
    companyConfig: any, 
    sefazConfig: any, 
    techRespConfig: any, 
    emissionData: { nNF: number }
) => {
    const { nNF } = emissionData;
    const dhEmi = new Date().toISOString();
    const cNF = pad(Math.floor(Math.random() * 99999999) + 1, 8);
    
    const total = parseFloat(order.total_value).toFixed(2);
    const vTotTrib = (parseFloat(total) * 0.267).toFixed(2); // Approximate tax, should be calculated properly

    const ufCodeMap: { [key: string]: string } = { 'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29', 'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17' };
    const cUF = ufCodeMap[companyConfig.uf] || '17';
    const cMun = companyConfig.city_code || '1721000';
    
    const nfeKeyPart = `${cUF}${dhEmi.substring(2,4)}${dhEmi.substring(5,7)}${(companyConfig.cnpj || '').replace(/\D/g, '')}65${pad(sefazConfig.serie || 1, 3)}${pad(nNF, 9)}1${cNF}`;
    
    let sum = 0;
    let weight = 2;
    for (let i = nfeKeyPart.length - 1; i >= 0; i--) {
        sum += parseInt(nfeKeyPart.charAt(i)) * weight;
        if (weight === 9) weight = 2; else weight++;
    }
    const remainder = sum % 11;
    const dv = (remainder < 2) ? 0 : 11 - remainder;

    const chaveAcesso = `${nfeKeyPart}${dv}`;
    const nfeId = `NFe${chaveAcesso}`;

    const qrCodeHashContent = `${chaveAcesso}|2|${sefazConfig.ambiente === 'producao' ? '1' : '2'}|${sefazConfig.csc_id}|`;
    const qrCodeHash = await sha1(qrCodeHashContent + sefazConfig.csc);
    const qrCodeParams = `${qrCodeHashContent}${qrCodeHash}`;
    const qrCodeUrl = `https://homologacao.sefaz.to.gov.br/nfce/qrcode?p=${qrCodeParams}`;
    const urlChave = `https://homologacao.sefaz.to.gov.br/nfce/consulta`;

    const itemsXml = order.items.map((item: any, index: number) => {
        const itemPrice = parseFloat(item.price);
        const itemTotal = (item.qty * itemPrice).toFixed(2);
        const itemTaxes = (parseFloat(itemTotal) * 0.267).toFixed(2); // Approximate tax

        return `
    <det nItem="${index + 1}">
        <prod>
            <cProd>${sanitize(String(item.id))}</cProd>
            <cEAN>SEM GTIN</cEAN>
            <xProd>${sanitize(item.name)}</xProd>
            <NCM>39269090</NCM>
            <CFOP>5102</CFOP>
            <uCom>UN</uCom>
            <qCom>${item.qty.toFixed(4)}</qCom>
            <vUnCom>${itemPrice.toFixed(10)}</vUnCom>
            <vProd>${itemTotal}</vProd>
            <cEANTrib>SEM GTIN</cEANTrib>
            <uTrib>UN</uTrib>
            <qTrib>${item.qty.toFixed(4)}</qTrib>
            <vUnTrib>${itemPrice.toFixed(10)}</vUnTrib>
            <indTot>1</indTot>
            <xPed>${order.id}</xPed>
        </prod>
        <imposto>
            <vTotTrib>${itemTaxes}</vTotTrib>
            <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
            <PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
            <COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
        </imposto>
    </det>`;
    }).join('');

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe versao="4.00" Id="${nfeId}">
<ide>
<cUF>${cUF}</cUF>
<cNF>${cNF}</cNF>
<natOp>VENDA</natOp>
<mod>65</mod>
<serie>${sefazConfig.serie}</serie>
<nNF>${nNF}</nNF>
<dhEmi>${dhEmi}</dhEmi>
<tpNF>1</tpNF>
<idDest>1</idDest>
<cMunFG>${cMun}</cMunFG>
<tpImp>4</tpImp>
<tpEmis>1</tpEmis>
<cDV>${dv}</cDV>
<tpAmb>${sefazConfig.ambiente === 'producao' ? '1' : '2'}</tpAmb>
<finNFe>1</finNFe>
<indFinal>1</indFinal>
<indPres>1</indPres>
<procEmi>0</procEmi>
<verProc>NFCePlus_1.0</verProc>
</ide>
<emit>
<CNPJ>${sanitize(companyConfig.cnpj?.replace(/\D/g, ''))}</CNPJ>
<xNome>${sanitize(companyConfig.razao_social)}</xNome>
<xFant>${sanitize(companyConfig.nome_fantasia)}</xFant>
<enderEmit>
<xLgr>${sanitize(companyConfig.endereco)}</xLgr>
<nro>${sanitize(companyConfig.numero)}</nro>
<xBairro>${sanitize(companyConfig.bairro)}</xBairro>
<cMun>${cMun}</cMun>
<xMun>${sanitize(companyConfig.cidade)}</xMun>
<UF>${sanitize(companyConfig.uf)}</UF>
<CEP>${sanitize(companyConfig.cep?.replace(/\D/g, ''))}</CEP>
<fone>${sanitize(companyConfig.fone?.replace(/\D/g, ''))}</fone>
</enderEmit>
<IE>${sanitize(companyConfig.ie?.replace(/\D/g, ''))}</IE>
<CRT>${sanitize(companyConfig.crt)}</CRT>
</emit>
${itemsXml}
<total>
<ICMSTot>
<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>
<vProd>${total}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>
<vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${total}</vNF><vTotTrib>${vTotTrib}</vTotTrib>
</ICMSTot>
</total>
<transp><modFrete>9</modFrete></transp>
<pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>${total}</vPag></detPag></pag>
<infRespTec>
<CNPJ>${sanitize(techRespConfig.tech_resp_cnpj?.replace(/\D/g, ''))}</CNPJ>
<xContato>${sanitize(techRespConfig.tech_resp_contact)}</xContato>
<email>${sanitize(techRespConfig.tech_resp_email)}</email>
<fone>${sanitize(techRespConfig.tech_resp_phone?.replace(/\D/g, ''))}</fone>
</infRespTec>
</infNFe>
<infNFeSupl>
<qrCode><![CDATA[${qrCodeUrl}]]></qrCode>
<urlChave>${urlChave}</urlChave>
</infNFeSupl>
</NFe>`.trim();

    return { xmlString, chaveAcesso };
};