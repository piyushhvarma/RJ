export declare class PdfGeneratorService {
    private streamToBuffer;
    private drawHeader;
    generatePledgeAgreement(loan: any): Promise<Buffer>;
    generateJewelleryAnnexure(loan: any): Promise<Buffer>;
    generatePaymentReceipt(payment: any): Promise<Buffer>;
    generateClosureReceipt(loan: any): Promise<Buffer>;
}
