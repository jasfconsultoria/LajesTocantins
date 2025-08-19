function getCompanyConfig() {
  const storedConfig = localStorage.getItem('nfceplus_company_config');
  if (storedConfig) {
    return JSON.parse(storedConfig);
  }
  return {
    cnpj: '16907877000109',
    razaoSocial: 'LAJES TOCANTINS LTDA',
    nomeFantasia: 'LAJES TOCANTINS',
    endereco: '812 SUL ALAMEDA 2',
    numero: 'S/N',
    complemento: 'PLANO DIRETOR SUL',
    bairro: 'CENTRO',
    cidade: 'PALMAS',
    uf: 'TO',
    cep: '77023134',
    fone: '6332142400',
    ie: '294439811',
    crt: '1',
    cityCode: '1721000',
  };
}

function getTechRespConfig() {
    const storedConfig = localStorage.getItem('nfceplus_tech_resp_config');
    if (storedConfig) {
        return JSON.parse(storedConfig);
    }
    return {
        cnpj: '02340319000191',
        contact: 'jose alves',
        email: 'jasfconsultoria@gmail.com',
        phone: '6392389218',
    };
}

export function generateXML(order) {
  const company = getCompanyConfig();
  const techResp = getTechRespConfig();

  const now = new Date();
  const dhEmi = now.toISOString().slice(0, 19) + '-03:00';
  const cNF = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const nNF = Math.floor(Math.random() * 100000).toString();
  const cDV = Math.floor(Math.random() * 10);
  const serie = '1';
  const ufCode = '17';
  const nfeId = `NFe${ufCode}${now.getFullYear().toString().substring(2,4)}${String(now.getMonth() + 1).padStart(2, '0')}${company.cnpj.replace(/[^\d]/g, '')}65${serie.padStart(3, '0')}${nNF.padStart(9, '0')}${cNF}${cDV}`;
  
  const totalValue = parseFloat(order.total.replace('R$ ', '').replace(',', '.')).toFixed(2);
  const totalTributos = (totalValue * 0.23).toFixed(2); 

  const itemsXml = order.items.map((item, index) => `
    <det nItem="${index + 1}">
      <prod>
        <cProd>${index + 1}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${item.name}</xProd>
        <NCM>68101100</NCM>
        <CFOP>5102</CFOP>
        <uCom>UN</uCom>
        <qCom>${item.qty.toFixed(4)}</qCom>
        <vUnCom>${parseFloat(item.price.replace('R$ ', '').replace(',', '.')).toFixed(2)}</vUnCom>
        <vProd>${(item.qty * parseFloat(item.price.replace('R$ ', '').replace(',', '.'))).toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>UN</uTrib>
        <qTrib>${item.qty.toFixed(4)}</qTrib>
        <vUnTrib>${parseFloat(item.price.replace('R$ ', '').replace(',', '.')).toFixed(2)}</vUnTrib>
        <indTot>1</indTot>
        <xPed>${order.id}</xPed>
      </prod>
      <imposto>
        <vTotTrib>${(parseFloat(item.price.replace('R$ ', '').replace(',', '.')) * item.qty * 0.23).toFixed(2)}</vTotTrib>
        <ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>
        <PIS><PISOutr><CST>99</CST><vBC>0.00</vBC><pPIS>0.00</pPIS><vPIS>0.00</vPIS></PISOutr></PIS>
        <COFINS><COFINSOutr><CST>99</CST><vBC>0.00</vBC><pCOFINS>0.00</pCOFINS><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>
      </imposto>
    </det>`).join('');

  const qrCodeData = `http://homologacao.sefaz.to.gov.br/nfce/qrcode?p=${nfeId.substring(3)}|2|2|1|${Math.random().toString(36).substring(2).toUpperCase()}`;
  const signatureValue = btoa(Math.random().toString()).substring(0, 100) + '==';
  const digestValue = btoa(Math.random().toString()).substring(0, 20) + '=';

  return `
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="${nfeId}">
    <ide>
      <cUF>${ufCode}</cUF>
      <cNF>${cNF}</cNF>
      <natOp>VENDA DE MERCADORIAS</natOp>
      <mod>65</mod>
      <serie>${serie}</serie>
      <nNF>${nNF}</nNF>
      <dhEmi>${dhEmi}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${company.cityCode || '1721000'}</cMunFG>
      <tpImp>4</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${cDV}</cDV>
      <tpAmb>2</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>NFC-e Plus v1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${company.cnpj.replace(/[^\d]/g, '')}</CNPJ>
      <xNome>${company.razaoSocial}</xNome>
      <xFant>${company.nomeFantasia}</xFant>
      <enderEmit>
        <xLgr>${company.endereco}</xLgr>
        <nro>${company.numero}</nro>
        <xCpl>${company.complemento}</xCpl>
        <xBairro>${company.bairro}</xBairro>
        <cMun>${company.cityCode || '1721000'}</cMun>
        <xMun>${company.cidade}</xMun>
        <UF>${company.uf}</UF>
        <CEP>${company.cep.replace(/[^\d]/g, '')}</CEP>
        <fone>${company.fone.replace(/[^\d]/g, '')}</fone>
      </enderEmit>
      <IE>${company.ie.replace(/[^\d]/g, '')}</IE>
      <CRT>${company.crt}</CRT>
    </emit>
    ${itemsXml}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${totalValue}</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>${totalValue}</vNF><vTotTrib>${totalTributos}</vTotTrib>
      </ICMSTot>
    </total>
    <transp><modFrete>9</modFrete></transp>
    <pag>
      <detPag><indPag>0</indPag><tPag>01</tPag><vPag>${totalValue}</vPag></detPag>
    </pag>
    <infRespTec>
      <CNPJ>${techResp.cnpj.replace(/[^\d]/g, '')}</CNPJ>
      <xContato>${techResp.contact}</xContato>
      <email>${techResp.email}</email>
      <fone>${techResp.phone.replace(/[^\d]/g, '')}</fone>
    </infRespTec>
  </infNFe>
  <infNFeSupl>
    <qrCode><![CDATA[${qrCodeData}]]></qrCode>
    <urlChave>http://homologacao.sefaz.to.gov.br/nfce/consulta.jsf</urlChave>
  </infNFeSupl>
  <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
    <SignedInfo>
      <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <Reference URI="#${nfeId}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/></Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/><DigestValue>${digestValue}</DigestValue></Reference>
    </SignedInfo>
    <SignatureValue>${signatureValue}</SignatureValue>
    <KeyInfo><X509Data><X509Certificate>MI...</X509Certificate></X509Data></KeyInfo>
  </Signature>
</NFe>
  `.trim();
}

export async function processNfceGeneration(order) {
  return new Promise(resolve => {
    setTimeout(() => {
      try {
        const xml = generateXML(order);
      
        if (Math.random() > 0.1) {
          console.log(`NFC-e XML gerado para o pedido #${order.id}:`, xml);
          resolve({ success: true, message: 'NFC-e autorizada com sucesso!', xml: xml });
        } else {
          console.error(`Falha ao gerar NFC-e para o pedido #${order.id}`);
          resolve({ success: false, message: 'Rejeitada: Erro de comunicação com a SEFAZ.' });
        }
      } catch (error) {
        console.error(`Erro crítico ao gerar XML para o pedido #${order.id}:`, error);
        resolve({ success: false, message: 'Erro interno ao gerar o XML da nota.' });
      }
    }, 2000);
  });
}