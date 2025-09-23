'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './payment-network.module.css';
import { useUserData } from '@/lib/stacks/user-stack';
import { PaymentNetworkModel } from '@/models/payment-method-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import DialogCancel from '@/components/DialogCancel';
import { usePaymentMethodModel } from '@/lib/stacks/payment-method-stack';

interface PaymentNetworkProps {
  paymentMethodId: string;
  onNetworkSelect: (network: PaymentNetworkModel) => void;
}

interface NetworkItemProps {
  onClick: () => void;
  network: PaymentNetworkModel;
  isSelected?: boolean;
}

const NetworkItem = ({ onClick, network, isSelected }: NetworkItemProps) => {
  const { theme } = useTheme();
  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div
      className={`${styles.networkItem} ${styles[`networkItem_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      aria-label={`Select ${network.identity}`}
      role="button"
      tabIndex={0}
    >
      <div className={styles.networkItemImage}>
        {network.image ? (
          <img src={network.image} alt={network.identity} />
        ) : (
          <div className={styles.networkInitials}>{getInitials(network.identity)}</div>
        )}
      </div>
      <div className={styles.networkItemInfo}>
        <div className={styles.networkItemName}>{network.identity}</div>
      </div>
      {isSelected && (
        <div className={styles.networkItemCheckmark}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        </div>
      )}
    </div>
  );
};

export default function PaymentNetwork({ paymentMethodId, onNetworkSelect }: PaymentNetworkProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const [networks, setNetworks] = useState<PaymentNetworkModel[]>([]);
  const [networkData, setNetworkData] = useState<PaymentNetworkModel | null>(null);
  const [userNetworkState, setUserNetworkState] = useState<'initial' | 'loading' | 'data' | 'error'>('initial');

  const [networkSelectId, networkSelectController, networkSelectIsOpen, networkSelectionState] = useSelectionController();
  const [searchNetworkQuery, setNetworkQuery] = useState('');

  const [methodsModel, , , { isHydrated }] = usePaymentMethodModel(lang);

  useEffect(() => {
    if(!networkData)return;
     onNetworkSelect(networkData);
  }, [networkData]);

  useEffect(() => {
    if(!isHydrated)return;
    const getMethod = methodsModel.find((e) => e.paymentMethodId === paymentMethodId);

    if (getMethod) {
      setNetworks(getMethod.paymentMethodNetwork);
      if(getMethod.paymentMethodNetwork.length > 0)networkSelectController.setSelectionState("data");;
    }

  }, [methodsModel, paymentMethodId ,isHydrated]);

   useEffect(() => {
      if (methodsModel.length <= 0)setNetworks([]);
   }, [methodsModel]);

  const openNetwork = useCallback(() => {
    if (!userData) return;
    networkSelectController.toggle();
  }, [userData, networkSelectController]);

  const handleNetworkSearch = useCallback((query: string) => {
    setNetworkQuery(query);
  }, []);

  const filteredNetworks = useMemo(() => {
    if (!searchNetworkQuery) return networks;

    const filters = networks.filter(item =>
      item.identity.toLowerCase().includes(searchNetworkQuery.toLowerCase())
    );

    if (filters.length <= 0 && networks.length > 0) {
      networkSelectController.setSelectionState("empty");
    }

    return filters;
  }, [networks, searchNetworkQuery]);

  const handleNetworkSelect = useCallback((network: PaymentNetworkModel) => {
    setNetworkData(network);
    networkSelectController.close();
  }, [networkSelectController]);

  const getInitials = useCallback((text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }, []);

  if(networks.length <= 0)return null;

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_network_text')}
      </h2>

      <div className={styles.formGroup}>
        <button onClick={openNetwork} className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
          {networkData ? (
            <div className={styles.selectedNetwork}>
              <div className={styles.networkImage}>
                {networkData.image ? (
                  <img src={networkData.image} alt={networkData.identity} />
                ) : (
                  <div className={styles.networkInitials}>{getInitials(networkData.identity)}</div>
                )}
              </div>
              <div className={`${styles.networkInfo} ${styles[`networkInfo_${theme}`]}`}>
                <div className={styles.networkName}>{networkData.identity}</div>
              </div>
            </div>
          ) : (
            <div className={styles.placeholder}>
              {t('select_payment_network')}
            </div>
          )}
          <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <SelectionViewer
        id={networkSelectId}
        isOpen={networkSelectIsOpen}
        onClose={networkSelectController.close}
        titleProp={{
          text: t('select_payment_network'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: networkSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleNetworkSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[1]}
        initialSnap={1}
        minHeight="65vh"
        maxHeight="90vh"
        closeThreshold={0.2}
        selectionState={networkSelectionState}
        zIndex={1000}
      >
        {filteredNetworks.map((item) => (
          <NetworkItem
            key={item.identity}
            onClick={() => handleNetworkSelect(item)}
            network={item}
            isSelected={networkData?.identity === item.identity}
          />
        ))}
      </SelectionViewer>
    </div>
  );
}