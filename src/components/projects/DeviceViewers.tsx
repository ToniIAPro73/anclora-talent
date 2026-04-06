'use client';

/**
 * Device Viewers - Professional Device Mockups
 * Renders content within realistic device frames (iPhone, iPad, MacBook, etc.)
 *
 * Respects:
 * - ANCLORA_PREMIUM_APP_CONTRACT.md (professional presentation)
 * - UI_MOTION_CONTRACT.md (smooth transitions)
 */

import React from 'react';
import type { PreviewFormat } from '@/lib/preview/device-configs';

interface DeviceFrameProps {
  children: React.ReactNode;
  format: PreviewFormat;
}

/**
 * Device Frame - Wraps content with realistic device bezel mockup
 */
export function DeviceFrame({ children, format }: DeviceFrameProps) {
  // Device-specific styling
  const deviceStyles = {
    mobile: {
      // iPhone 14 Pro - 393×852px
      width: 393,
      height: 852,
      bezelTop: 16,
      bezelBottom: 32,
      bezelSides: 12,
      cornerRadius: 52,
      bezelsColor: '#1a1a1a',
      notchWidth: 156,
      notchHeight: 28,
      notchRadius: 26,
    },
    tablet: {
      // iPad Air - 820×1180px
      width: 820,
      height: 1180,
      bezelTop: 24,
      bezelBottom: 24,
      bezelSides: 20,
      cornerRadius: 24,
      bezelsColor: '#1a1a1a',
    },
    laptop: {
      // MacBook Pro 14" - 1728×1117px
      width: 1728,
      height: 1117,
      bezelTop: 60, // Top bezel for menu bar
      bezelBottom: 80, // Larger bottom bezel
      bezelSides: 0,
      cornerRadius: 8,
      bezelsColor: '#2a2a2a',
      hasTopBezel: true,
    },
    ereader: {
      // Generic eReader - similar to mobile but different ratio
      width: 480,
      height: 720,
      bezelTop: 20,
      bezelBottom: 20,
      bezelSides: 16,
      cornerRadius: 16,
      bezelsColor: '#3a3a3a',
    },
  };

  const device = deviceStyles[format] || deviceStyles.laptop;
  const contentWidth = device.width - device.bezelSides * 2;
  const contentHeight = device.height - device.bezelTop - device.bezelBottom;

  if (format === 'mobile') {
    const mobileDevice = device as typeof device & { notchWidth: number; notchHeight: number; notchRadius: number };
    return (
      <div
        className="relative mx-auto"
        style={{
          width: device.width + 16,
          height: device.height + 16,
        }}
      >
        {/* Outer shadow */}
        <div
          className="absolute inset-0 rounded-[56px] shadow-2xl"
          style={{
            backgroundColor: device.bezelsColor,
            opacity: 0.3,
          }}
        />

        {/* Main device body */}
        <div
          className="relative mx-auto border-[12px] overflow-hidden flex flex-col"
          style={{
            width: device.width,
            height: device.height,
            borderColor: device.bezelsColor,
            borderRadius: device.cornerRadius,
            backgroundColor: '#000',
          }}
        >
          {/* Notch */}
          <div
            className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-black flex items-center justify-center gap-1 z-20"
            style={{
              width: mobileDevice.notchWidth,
              height: mobileDevice.notchHeight,
              borderRadius: `0 0 ${mobileDevice.notchRadius}px ${mobileDevice.notchRadius}px`,
            }}
          >
            <div className="w-1.5 h-1.5 bg-gray-800 rounded-full" />
            <div className="flex-1" />
            <div className="w-1 h-2.5 bg-gray-800 rounded-sm" />
          </div>

          {/* Content area */}
          <div
            className="flex-1 overflow-hidden bg-white"
            style={{
              marginTop: device.bezelTop,
              paddingTop: 0,
            }}
          >
            {children}
          </div>

          {/* Home indicator */}
          <div
            className="flex items-center justify-center bg-black py-2"
            style={{
              height: device.bezelBottom,
            }}
          >
            <div className="w-32 h-1 bg-gray-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (format === 'tablet') {
    return (
      <div
        className="relative mx-auto"
        style={{
          width: device.width + 40,
          height: device.height + 40,
        }}
      >
        {/* Outer shadow */}
        <div
          className="absolute inset-0 rounded-2xl shadow-2xl"
          style={{
            backgroundColor: device.bezelsColor,
            opacity: 0.3,
          }}
        />

        {/* Main device body */}
        <div
          className="relative mx-auto border overflow-hidden"
          style={{
            width: device.width,
            height: device.height,
            borderColor: device.bezelsColor,
            borderWidth: `${device.bezelTop}px ${device.bezelSides}px ${device.bezelBottom}px`,
            borderRadius: device.cornerRadius,
            backgroundColor: device.bezelsColor,
          }}
        >
          {/* Content area */}
          <div className="w-full h-full bg-white overflow-hidden">
            {children}
          </div>

          {/* Camera notch for iPad */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 bg-gray-900 rounded-full"
            style={{
              top: `${device.bezelTop / 2 - 6}px`,
              width: '12px',
              height: '12px',
            }}
          />
        </div>
      </div>
    );
  }

  if (format === 'laptop') {
    return (
      <div
        className="relative mx-auto"
        style={{
          width: device.width + 60,
          height: device.height + 80,
        }}
      >
        {/* Outer shadow */}
        <div
          className="absolute inset-0 rounded-3xl shadow-2xl"
          style={{
            backgroundColor: device.bezelsColor,
            opacity: 0.4,
          }}
        />

        {/* Stand */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 bottom-0 bg-gradient-to-b from-gray-300 to-gray-400"
          style={{
            width: '600px',
            height: '40px',
            borderRadius: '0 0 16px 16px',
            marginTop: '-1px',
          }}
        />

        {/* Main device body */}
        <div
          className="relative mx-auto border-8 overflow-hidden"
          style={{
            width: device.width,
            height: device.height,
            borderColor: device.bezelsColor,
            borderRadius: device.cornerRadius,
            backgroundColor: device.bezelsColor,
            marginTop: 20,
          }}
        >
          {/* Top menu bar area */}
          <div
            className="bg-gray-900 border-b border-gray-800 flex items-center px-6"
            style={{
              height: device.bezelTop,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>

          {/* Content area */}
          <div
            className="w-full overflow-hidden bg-white"
            style={{
              height: contentHeight,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Default/eReader
  return (
    <div
      className="relative mx-auto"
      style={{
        width: device.width + 32,
        height: device.height + 32,
      }}
    >
      {/* Outer shadow */}
      <div
        className="absolute inset-0 rounded-xl shadow-xl"
        style={{
          backgroundColor: device.bezelsColor,
          opacity: 0.3,
        }}
      />

      {/* Main device body */}
      <div
        className="relative mx-auto border overflow-hidden"
        style={{
          width: device.width,
          height: device.height,
          borderColor: device.bezelsColor,
          borderWidth: `${device.bezelTop}px ${device.bezelSides}px ${device.bezelBottom}px`,
          borderRadius: device.cornerRadius,
          backgroundColor: device.bezelsColor,
        }}
      >
        {/* Content area */}
        <div className="w-full h-full bg-gray-100 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
