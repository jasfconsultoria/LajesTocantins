import { v4 as uuidv4 } from 'uuid';

const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const pad = (num, size) => {
    let s = String(num);
    while (s.length < size) s = "0" + s;
    return s;
}

const sha1 = async (str) => {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.toUpperCase();
}

export const generateXML = async (order, companyConfig = {}, sefazConfig = {}, techRespConfig = {}, emissionData = {}) => {
    const { nNF } = emissionData;
    const dhEmi = new Date().toISOString();
    const cNF = pad(Math.floor(Math.random() * 100000000), 8);
    
    const total = parseFloat(order.total_value).toFixed(2);
    const vTotTrib = (total * 0.267).toFixed(2); // Approximate tax
    
    const ufCodeMap = { 'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29', 'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21', 'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25', 'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24', 'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35', 'SE': '28', 'TO': '17' };
    const cUF = ufCodeMap[companyConfig.uf] || '17';
    const cMun = companyConfig.city_code || '1721000';
    
    const nfeKeyPart = `${cUF}${dhEmi.substring(2,4)}${dhEmi.substring(5,7)}${companyConfig.cnpj?.replace(/\D/g, '') || '16907877000109'}65${pad(sefazConfig.serie || 0, 3)}${pad(nNF, 9)}1${cNF}`;
    // This is a simplified DV calculation. A real implementation would be more complex.
    const dv = (() => {
        let sum = 0;
        let weight = 2;
        for (let i = nfeKeyPart.length - 1; i >= 0; i--) {
            sum += parseInt(nfeKeyPart.charAt(i)) * weight;
            weight = weight === 9 ? 2 : weight + 1;
        }
        const remainder = sum % 11;
        return (remainder === 0 || remainder === 1) ? 0 : 11 - remainder;
    })();

    const chaveAcesso = `${nfeKeyPart}${dv}`;
    const nfeId = `NFe${chaveAcesso}`;

    const qrCodeHash = await sha1(chaveAcesso + sefazConfig.csc);
    const qrCodeParams = `${chaveAcesso}|2|${sefazConfig.ambiente === 'producao' ? '1' : '2'}|${sefazConfig.csc_id}|${qrCodeHash}`;
    const qrCodeUrl = sefazConfig.ambiente === 'producao' ? `https://nfce.sefaz.to.gov.br/nfce/qrcode?p=${qrCodeParams}` : `https://homologacao.sefaz.to.gov.br/nfce/qrcode?p=${qrCodeParams}`;
    const urlChave = sefazConfig.ambiente === 'producao' ? 'https://nfce.sefaz.to.gov.br/nfce/consulta.jsf' : 'https://homologacao.sefaz.to.gov.br/nfce/consulta.jsf';

    const emit = {
        CNPJ: companyConfig.cnpj?.replace(/\D/g, '') || '16907877000109',
        xNome: companyConfig.razao_social || 'LAJES TOCANTINS LTDA',
        xFant: companyConfig.nome_fantasia || 'LAJES TOCANTINS',
        enderEmit: {
            xLgr: companyConfig.endereco || '812 SUL ALAMEDA 2',
            nro: companyConfig.numero || 'S/N',
            xCpl: companyConfig.complemento || 'PLANO DIRETOR SUL',
            xBairro: companyConfig.bairro || 'CENTRO',
            cMun: cMun,
            xMun: companyConfig.cidade || 'PALMAS',
            UF: companyConfig.uf || 'TO',
            CEP: companyConfig.cep?.replace(/\D/g, '') || '77023134',
            fone: companyConfig.fone?.replace(/\D/g, '') || '6332142400',
        },
        IE: companyConfig.ie?.replace(/\D/g, '') || '294439811',
        CRT: companyConfig.crt || '1',
    };

    const respTec = {
        CNPJ: techRespConfig.tech_resp_cnpj?.replace(/\D/g, '') || '02340319000191',
        xContato: techRespConfig.tech_resp_contact || 'jose alves',
        email: techRespConfig.tech_resp_email || 'jasfconsultoria@gmail.com',
        fone: techRespConfig.tech_resp_phone?.replace(/\D/g, '') || '6392389218',
    };
    
    const itemsXml = order.items.map((item, index) => {
        const itemPrice = parseFloat(item.price);
        const itemTotal = (item.qty * itemPrice).toFixed(2);
        const itemTaxes = (itemTotal * 0.267).toFixed(2); // Approximate tax
        return `
    <det nItem="${index + 1}">
        <prod>
            <cProd>${index + 1}</cProd>
            <cEAN>SEM GTIN</cEAN>
            <xProd>${item.name}</xProd>
            <NCM>68101100</NCM>
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
            <ICMS>
                <ICMSSN102>
                    <orig>0</orig>
                    <CSOSN>102</CSOSN>
                </ICMSSN102>
            </ICMS>
            <PIS>
                <PISOutr>
                    <CST>99</CST>
                    <vBC>0.00</vBC>
                    <pPIS>0.00</pPIS>
                    <vPIS>0.00</vPIS>
                </PISOutr>
            </PIS>
            <COFINS>
                <COFINSOutr>
                    <CST>99</CST>
                    <vBC>0.00</vBC>
                    <pCOFINS>0.00</pCOFINS>
                    <vCOFINS>0.00</vCOFINS>
                </COFINSOutr>
            </COFINS>
        </imposto>
    </det>
    `;}).join('');

    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe versao="4.00" Id="${nfeId}">
<ide>
<cUF>${cUF}</cUF>
<cNF>${cNF}</cNF>
<natOp>VENDA PF - TO</natOp>
<mod>65</mod>
<serie>${sefazConfig.serie || 0}</serie>
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
<CNPJ>${emit.CNPJ}</CNPJ>
<xNome>${emit.xNome}</xNome>
<xFant>${emit.xFant}</xFant>
<enderEmit>
<xLgr>${emit.enderEmit.xLgr}</xLgr>
<nro>${emit.enderEmit.nro}</nro>
<xCpl>${emit.enderEmit.xCpl}</xCpl>
<xBairro>${emit.enderEmit.xBairro}</xBairro>
<cMun>${emit.enderEmit.cMun}</cMun>
<xMun>${emit.enderEmit.xMun}</xMun>
<UF>${emit.enderEmit.UF}</UF>
<CEP>${emit.enderEmit.CEP}</CEP>
<fone>${emit.enderEmit.fone}</fone>
</enderEmit>
<IE>${emit.IE}</IE>
<CRT>${emit.CRT}</CRT>
</emit>
${itemsXml}
<total>
<ICMSTot>
<vBC>0.00</vBC>
<vICMS>0.00</vICMS>
<vICMSDeson>0.00</vICMSDeson>
<vFCP>0.00</vFCP>
<vBCST>0.00</vBCST>
<vST>0.00</vST>
<vFCPST>0.00</vFCPST>
<vFCPSTRet>0.00</vFCPSTRet>
<vProd>${total}</vProd>
<vFrete>0.00</vFrete>
<vSeg>0.00</vSeg>
<vDesc>0.00</vDesc>
<vII>0.00</vII>
<vIPI>0.00</vIPI>
<vIPIDevol>0.00</vIPIDevol>
<vPIS>0.00</vPIS>
<vCOFINS>0.00</vCOFINS>
<vOutro>0.00</vOutro>
<vNF>${total}</vNF>
<vTotTrib>${vTotTrib}</vTotTrib>
</ICMSTot>
</total>
<transp>
<modFrete>9</modFrete>
</transp>
<pag>
<detPag>
<indPag>0</indPag>
<tPag>01</tPag>
<vPag>${total}</vPag>
</detPag>
</pag>
<infRespTec>
<CNPJ>${respTec.CNPJ}</CNPJ>
<xContato>${respTec.xContato}</xContato>
<email>${respTec.email}</email>
<fone>${respTec.fone}</fone>
</infRespTec>
</infNFe>
<infNFeSupl>
<qrCode>
<![CDATA[${qrCodeUrl}]]>
</qrCode>
<urlChave>${urlChave}</urlChave>
</infNFeSupl>
</NFe>
`.trim();

    // The signature part is highly complex and requires a crypto library.
    // In a real scenario, this would be handled by a backend service.
    // For this simulation, we'll just append a dummy signature block.
    
    const signedXml = xmlString.replace('</NFe>', `
<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
<SignedInfo>
<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
<Reference URI="#${nfeId}">
<Transforms>
<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
</Transforms>
<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
<DigestValue>${btoa(generateRandomString(20))}</DigestValue>
</Reference>
</SignedInfo>
<SignatureValue>${btoa(generateRandomString(256))}</SignatureValue>
<KeyInfo>
<X509Data>
<X509Certificate>${btoa(generateRandomString(1024))}</X509Certificate>
</X509Data>
</KeyInfo>
</Signature>
</NFe>`);

    return { xmlString: signedXml, chaveAcesso };
};