/**
 * Score Algorithm do Mediatio
 * Avalia veículos de 0 a 100 pontos com 10 critérios
 */

class ScoreCalculator {
  constructor(vehicle) {
    this.vehicle = vehicle;
    this.breakdown = [];
    this.total = 0;
    this.maximo = 100;
  }

  calcular() {
    this.breakdown = [];
    this.total = 0;

    this._avaliarFotos();
    this._avaliarDocumentacao();
    this._avaliarPrecoFipe();
    this._avaliarCondicoes();
    this._avaliarTempoPipeline();
    this._avaliarDadosCompletos();
    this._avaliarLeads();

    const scoreFinal = Math.min(Math.round((this.total / this.maximo) * 100), 100);

    return {
      valor: scoreFinal,
      breakdown: this.breakdown,
      label: this._getLabel(scoreFinal),
      ultimoCalculo: new Date(),
    };
  }

  _avaliarFotos() {
    const temOriginais = (this.vehicle.fotos?.originais?.length || 0) > 0;
    const temMelhoradas = (this.vehicle.fotos?.melhoradas?.length || 0) > 0;
    const temPrincipal = !!this.vehicle.fotos?.principal;

    let pontos = 0;
    if (temOriginais) pontos += 10;
    if (temMelhoradas) pontos += 20; // Foto melhorada pelo MORPH vale mais
    if (temPrincipal) pontos += 5;

    this._add('Fotos do Veículo', pontos, 35, temOriginais,
      temMelhoradas ? 'Foto profissional com IA ✓' :
      temOriginais ? 'Adicione foto melhorada pelo MORPH (+20pts)' :
      'Nenhuma foto cadastrada');
    this.total += pontos;
  }

  _avaliarDocumentacao() {
    const doc = this.vehicle.condicoes?.documentacao;
    const ok = doc === 'ok';
    const pendente = doc === 'pendente';

    const pontos = ok ? 15 : pendente ? 5 : 0;
    this._add('Documentação', pontos, 15, ok,
      ok ? 'Regularizada ✓' : pendente ? 'Pendente — verifique urgente' : 'Irregular — risco de venda');
    this.total += pontos;
  }

  _avaliarPrecoFipe() {
    const precoVenda = this.vehicle.precos?.venda || 0;
    const precoFipe = this.vehicle.precos?.fipeReferencia || 0;

    if (!precoFipe) {
      this._add('Preço vs FIPE', 0, 10, false, 'FIPE não consultada ainda');
      return;
    }

    const diferenca = ((precoVenda - precoFipe) / precoFipe) * 100;
    let pontos = 0;
    let obs = '';

    if (diferenca <= 0) { pontos = 10; obs = `${Math.abs(diferenca.toFixed(1))}% abaixo da FIPE — ótimo`; }
    else if (diferenca <= 10) { pontos = 10; obs = `${diferenca.toFixed(1)}% acima da FIPE — competitivo`; }
    else if (diferenca <= 20) { pontos = 5; obs = `${diferenca.toFixed(1)}% acima — considere reduzir`; }
    else { pontos = 0; obs = `${diferenca.toFixed(1)}% acima — preço alto`; }

    this._add('Preço Competitivo', pontos, 10, pontos === 10, obs);
    this.total += pontos;
  }

  _avaliarCondicoes() {
    const troca = this.vehicle.condicoes?.aceitaTroca;
    const financiamento = this.vehicle.condicoes?.aceitaFinanciamento;

    this._add('Aceita Troca', troca ? 8 : 0, 8, !!troca,
      troca ? 'Amplía o público de compradores ✓' : 'Considere aceitar trocas (+8pts)');
    this.total += troca ? 8 : 0;

    this._add('Aceita Financiamento', financiamento ? 7 : 0, 7, !!financiamento,
      financiamento ? 'Mais opções de pagamento ✓' : 'Financiamento aumenta vendas (+7pts)');
    this.total += financiamento ? 7 : 0;
  }

  _avaliarTempoPipeline() {
    const dias = this.vehicle.pipeline?.diasNoPipeline || 0;
    let pontos = 0;
    let obs = '';

    if (dias <= 10) { pontos = 15; obs = `${dias} dias — recém anunciado ✓`; }
    else if (dias <= 20) { pontos = 8; obs = `${dias} dias — atenção`; }
    else { pontos = 0; obs = `${dias} dias — muito tempo, revise o anúncio`; }

    this._add('Tempo no Pipeline', pontos, 15, dias <= 10, obs);
    this.total += pontos;
  }

  _avaliarDadosCompletos() {
    const temObs = !!(this.vehicle.anuncio?.observacoes?.length > 10);
    const temDono = !!this.vehicle.proprietario?.nome;
    const temCidade = !!this.vehicle.proprietario?.cidade;
    const temWhatsapp = !!this.vehicle.proprietario?.whatsapp;

    let pontos = 0;
    if (temObs) pontos += 3;
    if (temDono) pontos += 2;
    if (temCidade) pontos += 2;
    if (temWhatsapp) pontos += 3;

    this._add('Dados Completos', pontos, 10, pontos >= 8,
      pontos >= 8 ? 'Cadastro completo ✓' : 'Complete os dados do veículo');
    this.total += pontos;
  }

  _avaliarLeads() {
    const qtdLeads = this.vehicle.leads?.length || 0;
    const pontos = qtdLeads > 0 ? 5 : 0;
    const bonus = qtdLeads >= 3 ? 5 : 0; // Bônus para muito interesse

    this._add('Interesse de Compradores', pontos + bonus, 10, qtdLeads > 0,
      qtdLeads > 0 ? `${qtdLeads} lead(s) registrado(s) ✓` : 'Nenhum comprador ainda');
    this.total += pontos + bonus;
  }

  _add(criterio, pontos, maximo, atingido, observacao = '') {
    this.breakdown.push({ criterio, pontos, maximo, atingido, observacao });
  }

  _getLabel(score) {
    if (score >= 80) return 'Veículo Excelente';
    if (score >= 60) return 'Bom Potencial';
    if (score >= 40) return 'Atenção Necessária';
    return 'Crítico — Ação Urgente';
  }
}

module.exports = ScoreCalculator;
