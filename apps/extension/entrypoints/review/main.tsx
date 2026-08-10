import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReviewApp } from '@trail/review/app';
import { updateReportTitle } from '@/lib/db';
import { extensionLoader } from './loader.ts';
import './../../assets/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ReviewApp
    loader={extensionLoader}
    platform={{
      openTab: (url) => void browser.tabs.create({ url }),
      closeTab: () =>
        void browser.tabs.getCurrent().then((t) => t && browser.tabs.remove(t.id!)),
      persistTitle: (reportId, title) => void updateReportTitle(reportId, title),
    }}
  />,
);
