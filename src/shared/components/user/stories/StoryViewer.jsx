// src/components/stories/StoryViewer.jsx
import React, { useState } from 'react';
import { Button } from '../../ui/button.tsx';
import {
  Calendar,
  Download,
  Share,
  RefreshCw,
  PlusCircle,
  Printer,
  Instagram,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import QRCode from 'qrcode';

// Format date helper function (moved outside component for reuse in PDF generation)
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('en-US', options);
};

// Generate QR code as data URL
const generateQRCode = async (url) => {
  if (!url) {
    console.log('generateQRCode - No URL provided');
    return null;
  }

  console.log('generateQRCode - Generating QR code for URL:', url);

  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    console.log('generateQRCode - QR code generated successfully, length:', qrDataUrl?.length);
    return qrDataUrl;
  } catch (error) {
    console.error('generateQRCode - Failed to generate QR code:', error);
    return null;
  }
};

// Generate Instagram post URL if we have post ID
const getInstagramPostUrl = (postId) => {
  if (!postId) return null;
  // Instagram post URL format: https://www.instagram.com/p/{media-id}/
  return `https://www.instagram.com/p/${postId}/`;
};

const StoryViewer = ({
  story,
  onRegenerateStory,
  onCreateNew,
  loading,
  instagramData
}) => {
  const navigate = useNavigate();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Handle regenerate button click
  const handleRegenerateClick = () => {
    // Navigate to the generating page first
    navigate('/generating');

    // Then call the regeneration function
    onRegenerateStory();
  };
  // Parse content into paragraphs
  const contentParagraphs = story.content ?
    story.content.split('\n\n').filter(p => p.trim()) : [];

  // Copy to clipboard function
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        console.error('Fallback copy failed: ', err);
        document.body.removeChild(textArea);
        return false;
      }
    }
  };

  // Share content function
  const shareContent = async (shareData) => {
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (err) {
        console.error('Error sharing:', err);
        return false;
      }
    } else {
      console.warn('Web Share API not supported');
      return false;
    }
  };

  // Enhanced image handling function - matches admin pattern
  const getStoryImage = (story) => {
    if (!story) return null;

    // Use API image URL directly (like admin side does)
    if (story.image_original_url) {
      return story.image_original_url;
    }

    // Legacy support for base64 image data
    if (story.imageData) {
      if (typeof story.imageData === 'string') {
        // If it already starts with data:image, it's already properly formatted
        if (story.imageData.startsWith('data:image')) {
          return story.imageData;
        }
        // Otherwise, assume it's raw base64 and add proper prefix
        return `data:image/png;base64,${story.imageData}`;
      }
    }

    // Handle legacy imageUrl field
    if (story.imageUrl) {
      return story.imageUrl;
    }

    return null;
  };

  // Get the image source
  const imageSource = getStoryImage(story);

  // Wrapper function for download with loading state
  const handleDownload = async () => {
    try {
      setIsPdfGenerating(true);
      await downloadStyledPDF({
        story: { title: story.title, year: story.year, createdAt: story.createdAt },
        imageSource: imageSource,
        contentParagraphs: contentParagraphs,
        instagramData: instagramData
      });
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  // Wrapper function for print with loading state
  const handlePrint = async () => {
    try {
      setIsPdfGenerating(true);
      await printStyledPDF({
        story: { title: story.title, year: story.year, createdAt: story.createdAt },
        imageSource: imageSource,
        contentParagraphs: contentParagraphs,
        instagramData: instagramData
      });
    } catch (error) {
      console.error('Print failed:', error);
      alert('Failed to generate PDF for printing. Please try again.');
    } finally {
      setIsPdfGenerating(false);
    }
  };


  // Handle share button click
  const handleShare = async () => {
    const shareData = {
      title: story.title,
      text: `${story.title} - Year ${story.year}\n\n${story.content.substring(0, 100)}...`,
      url: window.location.href
    };

    // Try to use Web Share API
    const shared = await shareContent(shareData);

    // Fallback to copy to clipboard if sharing fails
    if (!shared) {
      const shareText = `${story.title} - Year ${story.year}\n\n${story.content}`;
      copyToClipboard(shareText);
      // You would need to show a toast/notification here
      alert("Text copied to clipboard for sharing");
    }
  };


  return (
    <div className="2xl:w-1/2 xl:w-1/2 max-w-screen-2xl mx-auto h-full flex flex-col" id={'jsx-template'}>
      {/* Header */}
      <header className="py-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">{story.title}</h1>
            <div className="flex items-center text-muted-foreground">
              {/* Only year here, not date */}
              <span>Year {story.year}</span>
            </div>
          </div>

          <div className="flex space-x-2">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerateClick}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Regenerate
            </Button> */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={onCreateNew}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Story
            </Button> */}
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="prose prose-lg w-full mx-auto">
          {imageSource && (
            <div className="mb-8 not-prose">
              <img
                src={imageSource}
                alt={story.title}
                className="w-full h-auto rounded-lg"
                onError={(e) => {
                  console.error("Story image failed to load:", imageSource);
                  e.target.onerror = null;
                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                }}
              />
            </div>
          )}

          {contentParagraphs.map((paragraph, index) => {
            // Skip title paragraphs
            if (paragraph.includes('**Title:')) {
              return null;
            }
            return (
              <p key={index} className=" text-sm/8  mb-4">{paragraph}</p>
            );
          })}
        </div>
      </div>

      {/* Instagram Status Section */}
      {(instagramData?.shared || instagramData?.rateLimited || instagramData?.instagramFailed) && (
        <div className="w-full mx-auto mt-6 mb-4">
          <div className={`rounded-lg p-4 border ${instagramData?.shared
            ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800'
            : instagramData?.instagramFailed
              ? 'bg-gradient-to-r from-red-50 to-red-50 dark:from-red-950/20 dark:to-red-950/20 border-red-200 dark:border-red-800'
              : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800'
            }`}>
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${instagramData?.shared
                ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                : instagramData?.instagramFailed
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}>
                <Instagram className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {instagramData?.shared ? 'Posted to Instagram' : instagramData?.instagramFailed ? 'Instagram Posting Failed' : 'Instagram Posting Limited'}
                  </h3>
                  {instagramData?.sharedAt && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(instagramData.sharedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {(instagramData?.rateLimited || instagramData?.instagramFailed) ? (
                  <div className="space-y-2">
                    <div className={`text-sm mb-3 ${instagramData?.instagramFailed
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                      }`}>
                      {instagramData.error || (instagramData?.instagramFailed
                        ? 'Instagram posting failed. Your story is ready and saved.'
                        : 'Instagram posting limit reached. Your story is ready but posting will need to wait.')
                      }
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Manual sharing with text
                          const shareText = `Check out my story: "${story.title}" - Set in year ${story.year}\n\n${story.content.substring(0, 200)}...\n\nGenerated with Futures of Hope`;
                          if (navigator.share) {
                            navigator.share({ title: story.title, text: shareText });
                          } else {
                            navigator.clipboard.writeText(shareText);
                            alert('Story text copied to clipboard!');
                          }
                        }}
                        className="h-7 text-xs"
                      >
                        <Share className="h-3 w-3 mr-1" />
                        Share Manually
                      </Button>
                      <span className={`text-xs ${instagramData?.instagramFailed
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                        }`}>
                        {instagramData?.instagramFailed
                          ? 'Instagram posting failed - share manually'
                          : 'Try again later for Instagram posting'
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-300">
                      <span>📸 {instagramData.slideCount || 1} slide{(instagramData.slideCount || 1) > 1 ? 's' : ''}</span>
                      {instagramData.handleSubmitted && instagramData.handle && (
                        <span>👤 {instagramData.handle}</span>
                      )}
                    </div>

                    {instagramData.postId && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Use carouselUrl if available, otherwise generate from postId
                            const url = instagramData.carouselUrl || getInstagramPostUrl(instagramData.postId);
                            window.open(url, '_blank');
                          }}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View on Instagram
                        </Button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          ID: {instagramData.postId}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <footer className="py-6 border-t mt-auto">
        <div className="flex items-center justify-center w-full mx-auto space-x-8">
          <div className="flex items-center space-x-3 mb-4">
            <Button
              variant="outline"
              //size="lg"
              onClick={onCreateNew}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Story
            </Button>

            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isPdfGenerating}
            >
              {isPdfGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isPdfGenerating ? 'Preparing...' : 'Download'}
            </Button>

            <Button
              variant="outline"
              onClick={handlePrint}
              disabled={isPdfGenerating}
            >
              {isPdfGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Printer className="h-4 w-4 mr-2" />
              )}
              {isPdfGenerating ? 'Preparing...' : 'Print'}
            </Button>



            {/* Only show regular Share button if not shared to Instagram */}
            {!instagramData?.shared && (
              <Button
                variant="outline"
                //size="lg"
                onClick={handleShare}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}

            {/* Show Instagram share status in footer */}
            {instagramData?.shared && (
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <Instagram className="h-4 w-4 mr-2" />
                <span>Shared to Instagram</span>
              </div>
            )}

            {(instagramData?.rateLimited || instagramData?.instagramFailed) && (
              <div className={`flex items-center text-sm ${instagramData?.instagramFailed
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
                }`}>
                <Instagram className="h-4 w-4 mr-2" />
                <span>{instagramData?.instagramFailed ? 'Instagram posting failed' : 'Instagram posting limited'}</span>
              </div>
            )}
          </div>
        </div>
        {/* Collection info with date moved here */}
        <div className="text-sm text-muted-foreground ml-auto">
          <div className="flex justify-center items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            <span className="mr-1">Created on</span>
            <span className="mr-1">{formatDate(story.createdAt)}</span>
            <span>· Futures of Hope</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StoryViewer;

const preload = src =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      console.log('Preload - Image loaded successfully:', src?.substring(0, 50) + '...');
      resolve();
    };
    img.onerror = (error) => {
      console.error('Preload - Image failed to load:', src?.substring(0, 50) + '...', error);
      reject(error);
    };
    img.src = src;
  });

// Wait for all images in a container to load
const waitForAllImages = (container) => {
  const images = container.querySelectorAll('img');
  console.log(`waitForAllImages - Found ${images.length} images to load`);

  const imagePromises = Array.from(images).map((img, index) => {
    return new Promise((resolve) => {
      if (img.complete && img.naturalHeight !== 0) {
        console.log(`waitForAllImages - Image ${index} already loaded`);
        resolve();
      } else {
        img.onload = () => {
          console.log(`waitForAllImages - Image ${index} loaded successfully`);
          resolve();
        };
        img.onerror = () => {
          console.error(`waitForAllImages - Image ${index} failed to load, continuing anyway`);
          resolve(); // Resolve even on error to not block the process
        };
        // Fallback timeout for stuck images
        setTimeout(() => {
          console.warn(`waitForAllImages - Image ${index} load timeout, continuing anyway`);
          resolve();
        }, 5000);
      }
    });
  });

  return Promise.all(imagePromises);
};

const downloadStyledPDF = async ({ story, imageSource, contentParagraphs, instagramData, returnInstance = false }) => {
  const startTime = performance.now();
  console.log('PDF Generation - Starting PDF generation process...');

  // 4R postcard = ~152 x 102 mm, landscape
  const pdf = new jsPDF('l', 'mm', [152, 102]);
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Create off-screen container
  const container = document.createElement('div');
  container.id = 'pdf-postcard-container';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '600px';
  container.style.padding = '0';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#111827';
  document.body.appendChild(container);

  if (imageSource) await preload(imageSource);

  // Debug logging for Instagram data
  console.log('PDF Generation - Instagram data:', instagramData);
  console.log('PDF Generation - Has postId:', !!instagramData?.postId);

  // Generate QR code for Instagram post if available
  let qrCodeDataUrl = null;
  if (instagramData?.postId) {
    const instagramUrl = instagramData.carouselUrl || getInstagramPostUrl(instagramData.postId);
    console.log('PDF Generation - Instagram URL:', instagramUrl);
    qrCodeDataUrl = await generateQRCode(instagramUrl);
    console.log('PDF Generation - QR code generated:', !!qrCodeDataUrl);
  } else {
    console.log('PDF Generation - No Instagram postId found, skipping QR code');
  }

  const jsxContent = (
    <div
      style={{
        fontFamily: 'Work Sans, sans-serif',
        color: '#111827',
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {imageSource && (
        <div
          style={{
            width: '100%',
            height: '3.5in',
            position: 'relative',
            overflow: 'hidden',
            top: '0',
            left: '0',
          }}
        >
          <img
            src={imageSource}
            alt={story.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      )}

      <div
        style={{
          flex: '1 0 auto',
          boxSizing: 'border-box',
          height: '0.75in',
        }}
      >

        {qrCodeDataUrl && (
          <div
            style={{
              width: '0.8in',
              height: '1.15in',
              border: '1px solid #000000ff',
              zIndex: '10',
              position: 'absolute',
              top: '2.90in',
              left: '0.2in',
              backgroundColor: '#ffffff',

              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0.01in',
            }}
          >
            <img
              src={qrCodeDataUrl}
              alt="QR code for Instagram post"
              style={{
                width: '0.75in',
                height: '0.75in',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
              onLoad={() => console.log('PDF Generation - QR code image loaded successfully')}
              onError={(e) => console.error('PDF Generation - QR code image failed to load:', e)}
            />

            <p
              style={{
                margin: '0 0 0 0',
                fontSize: '11px',
                lineHeight: '1.0',
                textAlign: 'left',
                fontWeight: 300,
              }}
            >
              scan to read<br />the future
            </p>
          </div>
        )}
        {!qrCodeDataUrl && instagramData?.postId && (
          <div style={{ display: 'none' }}>
            {console.log('PDF Generation - QR code should render but qrCodeDataUrl is null')}
          </div>
        )}

        <div
          style={{
            width: '4.25in',
            height: '0.60in',
            zIndex: '10',
            position: 'absolute',
            top: '3.45in',
            //left: '1.1in',
            left: qrCodeDataUrl ? '1.1in' : '0.3in',

            display: 'flex',
            flexDirection: 'column',
            alignItems: 'left',
            justifyContent: 'center',
            padding: '0.01in',
          }}
        >
          <h1
            style={{
              margin: 0,
              width: '100%',
              fontSize: '18px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: '#111827',
              lineHeight: '1.0',
            }}
          >
            {story.title}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: '#111827',
            }}
          >
            Year {story.year}
          </p>

        </div>

        <img
          src="/QLO_logo_color.png"
          alt="Quest Learning Observatory Logo"
          style={{
            position: 'absolute',
            marginLeft: '0px',
            marginTop: '14px',
            top: '3.5in',
            left: '5.0in',
            height: '0.33in',
            width: 'auto',
            boxSizing: 'border-box',

          }}
        />
      </div>
    </div>
  );

  const root = ReactDOM.createRoot(container);
  root.render(jsxContent);

  // Wait for React to render and all assets to load
  console.log('PDF Generation - Waiting for React rendering...');
  await new Promise((resolve) => setTimeout(resolve, 100)); // Brief wait for React render

  console.log('PDF Generation - Waiting for all images to load...');
  await waitForAllImages(container);

  // Additional small buffer to ensure everything is stable
  console.log('PDF Generation - Final stability wait...');
  await new Promise((resolve) => setTimeout(resolve, 200));

  console.log('PDF Generation - Starting html2canvas capture...');
  const canvasStartTime = performance.now();

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    scrollY: -window.scrollY,
    backgroundColor: '#ffffff',
    windowWidth: container.scrollWidth,
  });

  const canvasEndTime = performance.now();
  console.log(`PDF Generation - html2canvas completed in ${Math.round(canvasEndTime - canvasStartTime)}ms`);

  const imgData = canvas.toDataURL('image/jpeg', 1.0);

  const scaledWidth = pageWidth;
  const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

  pdf.addImage(imgData, 'JPEG', 0, 0, scaledWidth, scaledHeight);

  root.unmount();
  document.body.removeChild(container);

  const endTime = performance.now();
  console.log(`PDF Generation - Total process completed in ${Math.round(endTime - startTime)}ms`);

  const safeTitle = story.title.replace(/\s+/g, '_').toLowerCase();

  if (returnInstance) {
    return pdf;
  } else {
    pdf.save(`${safeTitle}.pdf`);
  }
};


const printStyledPDF = async ({ story, imageSource, contentParagraphs, instagramData }) => {
  const pdf = await downloadStyledPDF({
    story,
    imageSource,
    contentParagraphs,
    instagramData,
    returnInstance: true // enable PDF return instead of save
  });

  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Create hidden iframe for printing instead of opening new window
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = pdfUrl;
  document.body.appendChild(iframe);

  iframe.onload = function () {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(pdfUrl);
    }, 1000);
  };
};
