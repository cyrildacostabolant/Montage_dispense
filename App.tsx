
import React, { useState, useRef } from 'react';
import { Download, Trash2, Plus, Image as ImageIcon, FileText, Loader2, Train } from 'lucide-react';
import { CroppedImage } from './types';

const CARD_WIDTH_MM = 75;
const CARD_HEIGHT_MM = 112.5;
const SPACING_PX = 20;

const App: React.FC = () => {
  const [images, setImages] = useState<CroppedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [iconError, setIconError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const a4PageRef = useRef<HTMLDivElement>(null);

  const getContentBounds = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];
        
        if (a > 0 && (r < 254 || g < 254 || b < 254)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return { x: 0, y: 0, width: canvas.width, height: canvas.height };

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  };

  const cropImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const analysisCanvas = document.createElement('canvas');
          analysisCanvas.width = img.width;
          analysisCanvas.height = img.height;
          const aCtx = analysisCanvas.getContext('2d');
          if (!aCtx) return reject('Failed to get analysis context');
          aCtx.drawImage(img, 0, 0);

          const bounds = getContentBounds(analysisCanvas);
          if (!bounds) return reject('Failed to detect bounds');

          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = 885;
          finalCanvas.height = 1328;
          const fCtx = finalCanvas.getContext('2d');
          if (!fCtx) return reject('Failed to get final context');
          
          fCtx.fillStyle = '#FFFFFF';
          fCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

          const targetWidth = 885;
          const targetHeight = 1328;
          const targetRatio = targetWidth / targetHeight;
          const contentRatio = bounds.width / bounds.height;
          
          let drawWidth, drawHeight;
          let sX = bounds.x;
          let sY = bounds.y;
          let sWidth = bounds.width;
          let sHeight = bounds.height;

          if (contentRatio > targetRatio) {
            drawWidth = targetWidth;
            drawHeight = targetWidth / contentRatio;
          } else {
            drawHeight = targetHeight;
            drawWidth = targetHeight * contentRatio;
          }

          const drawX = (targetWidth - drawWidth) / 2;
          const drawY = 0;

          fCtx.drawImage(
            img, 
            sX, sY, sWidth, sHeight, 
            drawX, drawY, drawWidth, drawHeight
          );
          
          resolve(finalCanvas.toDataURL('image/jpeg', 0.98));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const croppedDataUrl = await cropImage(file);
      const newImage: CroppedImage = {
        id: Math.random().toString(36).substr(2, 9),
        originalName: file.name,
        dataUrl: croppedDataUrl,
      };
      setImages((prev) => [...prev, newImage]);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Erreur lors du traitement de l\'image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const downloadJpg = async () => {
    if (!a4PageRef.current || images.length === 0) return;

    setIsExporting(true);
    try {
      const canvas = await window.html2canvas(a4PageRef.current, {
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `planche_dispenses_${Date.now()}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'exportation.');
    } finally {
      setIsExporting(false);
    }
  };

  const isFull = images.length >= 4;

  return (
    <div className="min-h-screen flex flex-col md:flex-row gap-6 p-4 md:p-8 max-w-[1600px] mx-auto bg-slate-50">
      <div className="w-full md:w-1/3 lg:w-1/4 flex flex-col gap-6">
        <header>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-blue-100 flex-shrink-0 border-2 border-white bg-[#0091d3] flex items-center justify-center">
              {!iconError ? (
                <img 
                  src="icon.png" 
                  alt="Logo" 
                  className="w-full h-full object-cover" 
                  onError={() => setIconError(true)} 
                />
              ) : (
                <Train className="text-white" size={24} />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              Montage <span className="text-[#0091d3]">Dispenses</span>
            </h1>
          </div>
          <p className="text-slate-500 text-sm leading-snug">
            Optimisé pour les justificatifs SNCF. Rognage 7.5x11.25cm.
          </p>
        </header>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isFull}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all shadow-md ${
                isFull
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-[#0091d3] text-white hover:bg-[#007bb3] active:scale-[0.98]'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Plus size={20} strokeWidth={3} />}
              {isFull ? 'Planche pleine (Max 4)' : 'Ajouter un billet'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              onClick={downloadJpg}
              disabled={images.length === 0 || isExporting}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold transition-all border-2 ${
                images.length === 0 || isExporting
                  ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                  : 'border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white active:scale-[0.98]'
              }`}
            >
              {isExporting ? <Loader2 className="animate-spin" /> : <Download size={20} strokeWidth={3} />}
              Exporter Planche A4
            </button>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1">
            Contenu de la planche ({images.length}/4)
          </h2>
          <div className="space-y-2">
            {images.map((img) => (
              <div key={img.id} className="bg-white p-2 rounded-xl border border-slate-100 flex items-center gap-3 group hover:border-blue-200 transition-colors animate-in fade-in slide-in-from-left-2">
                <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                  <img src={img.dataUrl} alt="Preview" className="w-full h-full object-cover object-top" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{img.originalName}</p>
                  <p className="text-[10px] text-[#0091d3] font-bold uppercase tracking-wider">Prêt</p>
                </div>
                <button
                  onClick={() => removeImage(img.id)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors group-hover:opacity-100 opacity-40"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {images.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                <FileText className="mx-auto text-slate-300 mb-2 opacity-50" size={28} />
                <p className="text-xs font-medium text-slate-400">Aucun fichier ajouté</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-slate-200/50 rounded-3xl p-4 md:p-8 flex items-center justify-center overflow-auto border-4 border-white shadow-inner">
        <div className="relative transform scale-[0.35] sm:scale-[0.45] md:scale-[0.6] lg:scale-[0.7] xl:scale-[0.85] origin-top drop-shadow-2xl">
          <div
            ref={a4PageRef}
            className="a4-page flex flex-wrap content-start"
            style={{ 
              gap: `${SPACING_PX}px`,
              padding: '15mm' 
            }}
          >
            {images.map((img) => (
              <div key={img.id} className="card-container">
                <img src={img.dataUrl} alt="Cropped Result" className="card-image" />
              </div>
            ))}
          </div>
          
          <div className="absolute top-[-50px] left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black tracking-widest uppercase px-5 py-2 rounded-full border border-white/10 shadow-lg">
              Format A4 • Impression Justificatifs
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
