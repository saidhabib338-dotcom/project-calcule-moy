const { calculerDeliberationEtudiant } = require('./lmdService');
const { db } = require('../db/database');

const WSDL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="ScolariteLMDService"
  targetNamespace="http://univ.tn/scolarite/soap"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://univ.tn/scolarite/soap"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <types>
    <xsd:schema targetNamespace="http://univ.tn/scolarite/soap">
      <!-- CalculerMoyenneEtudiant Request / Response -->
      <xsd:element name="CalculerMoyenneEtudiantRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="etudiantId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:element name="CalculerMoyenneEtudiantResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="etudiantNom" type="xsd:string"/>
            <xsd:element name="classe" type="xsd:string"/>
            <xsd:element name="moyenneGenerale" type="xsd:float"/>
            <xsd:element name="creditsValides" type="xsd:int"/>
            <xsd:element name="creditsTotaux" type="xsd:int"/>
            <xsd:element name="mention" type="xsd:string"/>
            <xsd:element name="statut" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <!-- VerifierStatutEtudiant Request / Response -->
      <xsd:element name="VerifierStatutEtudiantRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="etudiantId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:element name="VerifierStatutEtudiantResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="etudiantId" type="xsd:string"/>
            <xsd:element name="statut" type="xsd:string"/>
            <xsd:element name="estAdmis" type="xsd:boolean"/>
            <xsd:element name="observation" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <!-- Messages -->
  <message name="CalculerMoyenneEtudiantInput">
    <part name="parameters" element="tns:CalculerMoyenneEtudiantRequest"/>
  </message>
  <message name="CalculerMoyenneEtudiantOutput">
    <part name="parameters" element="tns:CalculerMoyenneEtudiantResponse"/>
  </message>

  <message name="VerifierStatutEtudiantInput">
    <part name="parameters" element="tns:VerifierStatutEtudiantRequest"/>
  </message>
  <message name="VerifierStatutEtudiantOutput">
    <part name="parameters" element="tns:VerifierStatutEtudiantResponse"/>
  </message>

  <!-- Port Type -->
  <portType name="ScolariteLMDPortType">
    <operation name="CalculerMoyenneEtudiant">
      <input message="tns:CalculerMoyenneEtudiantInput"/>
      <output message="tns:CalculerMoyenneEtudiantOutput"/>
    </operation>
    <operation name="VerifierStatutEtudiant">
      <input message="tns:VerifierStatutEtudiantInput"/>
      <output message="tns:VerifierStatutEtudiantOutput"/>
    </operation>
  </portType>

  <!-- Binding SOAP -->
  <binding name="ScolariteLMDBinding" type="tns:ScolariteLMDPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="CalculerMoyenneEtudiant">
      <soap:operation soapAction="http://univ.tn/scolarite/soap/CalculerMoyenneEtudiant"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="VerifierStatutEtudiant">
      <soap:operation soapAction="http://univ.tn/scolarite/soap/VerifierStatutEtudiant"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <!-- Service Definition -->
  <service name="ScolariteLMDService">
    <documentation>Service SOAP officiel pour le calcul et audit des délibérations académiques LMD</documentation>
    <port name="ScolariteLMDPort" binding="tns:ScolariteLMDBinding">
      <soap:address location="http://localhost:5000/soap"/>
    </port>
  </service>
</definitions>`;

function extractTagValue(xml, tagName) {
  const regex = new RegExp(`<(?:[a-zA-Z0-9]+:)?${tagName}>([\\s\\S]*?)<\\/(?:[a-zA-Z0-9]+:)?${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function handleSoapRequest(xmlBody, reqUrl) {
  const isCalculer = xmlBody.includes('CalculerMoyenneEtudiant');
  const isVerifier = xmlBody.includes('VerifierStatutEtudiant');

  const etudiantId = extractTagValue(xmlBody, 'etudiantId');

  if (!etudiantId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Paramètre etudiantId manquant dans le corps de la requête SOAP.</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  const deliberation = calculerDeliberationEtudiant(etudiantId);
  if (!deliberation) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Server</faultcode>
      <faultstring>Étudiant introuvable avec l'identifiant ${etudiantId}.</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
  }

  if (isCalculer) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://univ.tn/scolarite/soap">
  <soap:Header/>
  <soap:Body>
    <tns:CalculerMoyenneEtudiantResponse>
      <etudiantNom>${deliberation.etudiant.prenom} ${deliberation.etudiant.nom}</etudiantNom>
      <classe>${deliberation.etudiant.classe}</classe>
      <moyenneGenerale>${deliberation.moyenneGenerale.toFixed(2)}</moyenneGenerale>
      <creditsValides>${deliberation.creditsValides}</creditsValides>
      <creditsTotaux>${deliberation.creditsTotaux}</creditsTotaux>
      <mention>${deliberation.mention}</mention>
      <statut>${deliberation.statut}</statut>
      <observation>${deliberation.observation}</observation>
    </tns:CalculerMoyenneEtudiantResponse>
  </soap:Body>
</soap:Envelope>`;
  }

  if (isVerifier) {
    const estAdmis = deliberation.statut === 'Admis' || deliberation.statut === 'Admis par Rachat';
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://univ.tn/scolarite/soap">
  <soap:Header/>
  <soap:Body>
    <tns:VerifierStatutEtudiantResponse>
      <etudiantId>${deliberation.etudiant.id}</etudiantId>
      <etudiantNom>${deliberation.etudiant.prenom} ${deliberation.etudiant.nom}</etudiantNom>
      <statut>${deliberation.statut}</statut>
      <estAdmis>${estAdmis}</estAdmis>
      <observation>${deliberation.observation}</observation>
    </tns:VerifierStatutEtudiantResponse>
  </soap:Body>
</soap:Envelope>`;
  }

  // Fallback
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>Opération SOAP non reconnue.</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;
}

module.exports = {
  WSDL_XML,
  handleSoapRequest
};
