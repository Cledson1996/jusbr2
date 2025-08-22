import React, { useState, useRef, useEffect } from "react";
import { ProcessoData } from "../services/processoService";

interface ActionMenuProps {
  processo: ProcessoData;
  onShowDetalhes: (processo: ProcessoData) => void;
  onShowDocumentos: (processo: ProcessoData) => void;
  onShowMovimentos: (processo: ProcessoData) => void;
}

export default function ActionMenu({
  processo,
  onShowDetalhes,
  onShowDocumentos,
  onShowMovimentos,
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            <button
              onClick={() => handleAction(() => onShowDetalhes(processo))}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Ver Detalhes
            </button>
            <button
              onClick={() => handleAction(() => onShowDocumentos(processo))}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Ver Documentos
            </button>
            <button
              onClick={() => handleAction(() => onShowMovimentos(processo))}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              Ver Movimentos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
