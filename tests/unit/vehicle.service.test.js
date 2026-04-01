const VehicleService = require('../../src/modules/vehicles/vehicle.service');
const VehicleRepository = require('../../src/modules/vehicles/vehicle.repository');

jest.mock('../../src/modules/vehicles/vehicle.repository');

describe('VehicleService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createVehicle', () => {
    it('deve criar veículo com código automático', async () => {
      const mockData = {
        tipo: 'moto',
        marca: 'Honda',
        modelo: 'CG 160',
        ano: 2022,
        precos: { venda: 15000 }
      };
      
      VehicleRepository.create.mockResolvedValue({
        ...mockData,
        codigo: 'MOTO-2025-0001'
      });
      
      const result = await VehicleService.createVehicle(mockData, 'user123');
      
      expect(result.codigo).toMatch(/MOTO-\d{4}-\d{4}/);
      expect(VehicleRepository.create).toHaveBeenCalled();
    });
  });
  
  describe('recalculateScore', () => {
    it('deve calcular score máximo para veículo completo', async () => {
      const mockVehicle = {
        fotos: { originais: [{ url: 'x' }], melhoradas: [{ url: 'y' }], principal: 'z' },
        condicoes: { documentacao: 'ok', aceitaTroca: true, aceitaFinanciamento: true },
        precos: { venda: 10000, fipeReferencia: 10000 },
        anuncio: { observacoes: 'Texto longo aqui' },
        proprietario: { nome: 'João', cidade: 'Ibirama' },
        leads: [{ id: 1 }],
        pipeline: { diasNoPipeline: 5 }
      };
      
      VehicleRepository.findById.mockResolvedValue(mockVehicle);
      VehicleRepository.update.mockResolvedValue({});
      
      const score = await VehicleService.recalculateScore('123');
      
      expect(score.valor).toBeGreaterThanOrEqual(80);
      expect(score.label).toBe('Veículo Excelente');
    });
  });
});