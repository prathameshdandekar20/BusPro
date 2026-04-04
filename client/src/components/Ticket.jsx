import React from 'react';
import { motion } from 'framer-motion';
import './Ticket.css';
import ReactQRCode from 'react-qr-code';
const QRCode = ReactQRCode.default || ReactQRCode.QRCode || ReactQRCode;
const azadiLogo = '/azadi.png';
const g20Logo = '/g20.png';
const morthLogo = '/morth.png';
const swachhLogo = '/swachh_bharat.png';
import { Share } from '@capacitor/share';
import { isNativeApp } from '../utils/platform';

const Ticket = ({ ride, user, onPrint, onClose }) => {
  if (!ride) return null;

  const handlePrintOrShare = async () => {
    if (isNativeApp()) {
      try {
        await Share.share({
          title: 'SmartBus Ticket',
          text: `🎟️ My SmartBus Ticket (PNR: ${ride?._id ? String(ride._id).substring(String(ride._id).length - 10).toUpperCase() : 'UNKNOWN'})\n📍 ${ride?.boardingPoint} to ${ride?.droppingPoint}`,
          url: ride?._id ? `${window.location.origin}/dashboard/ticket/${ride._id}` : window.location.origin,
          dialogTitle: 'Share or Save Ticket'
        });
      } catch(e) { console.error('Share failed', e); }
    } else {
      if (onPrint) onPrint();
      else window.print();
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const pnr = ride?._id ? String(ride._id).substring(String(ride._id).length - 10).toUpperCase() : 'UNKNOWN PNR';
  const journeyDate = ride?.createdAt ? new Date(ride.createdAt).toLocaleDateString('en-IN') : 'N/A';

  // Ensures the QR redirects to your live Vercel site even when testing on localhost
  const getBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname.includes('192.168.')) {
      return import.meta.env.VITE_CLIENT_URL || 'https://bus-pro-gamma.vercel.app'; 
    }
    return window.location.origin;
  };

  const qrTicketUrl = `${getBaseUrl()}/dashboard/ticket/${ride?._id || 'unknown'}`;

  return (
    <div className="ticket-modal-overlay" onClick={(e) => e.target.className === 'ticket-modal-overlay' && onClose()}>
      <motion.div 
        className="ticket-container"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ticket-controls-header">
          <button className="btn-print-action" onClick={handlePrintOrShare}>
            <span>{isNativeApp() ? '📤' : '🖨️'}</span> {isNativeApp() ? 'Share / Save' : 'Print Ticket'}
          </button>
          <button className="btn-close-ticket" onClick={onClose} aria-label="Close Ticket">✕ Close</button>
        </div>

        <div className="ticket-scroll-area">
          <div className="printable-ticket" id="printable-ticket">
            {/* PAGE 1: TICKET DETAILS */}
            <div className="ticket-page page-1">
              {/* National Identity Header - IRCTC Style */}
              <div className="national-pride-header">
                <div className="azadi-badge-img">
                  <img src={azadiLogo} alt="Azadi Ka Amrit Mahotsav" />
                </div>
                <div className="india-crest-section">
                  <img src={morthLogo} alt="MoRTH" className="morth-logo-img" />
                  <div className="goi-text">GOVERNMENT OF INDIA</div>
                  <div className="ministry-text">MINISTRY OF ROAD TRANSPORT & HIGHWAYS</div>
                </div>
                <div className="g20-badge-img">
                  <img src={g20Logo} alt="G20 India" />
                </div>
              </div>

              <div className="ers-main-title">
                <h1>ELECTRONIC RESERVATION SLIP (ERS)</h1>
                <p>Valid for travel along with original Photo ID card</p>
              </div>

              <div className="ticket-info-grid">
                <div className="info-box-left">
                  <div className="info-line"><strong>PNR No:</strong> <span className="pnr-text">{pnr}</span></div>
                  <div className="info-line"><strong>Bus No / Name:</strong> {ride.busId?.busNumber || 'UP-32-EX-1234'}</div>
                  <div className="info-line"><strong>Journey Date:</strong> {journeyDate}</div>
                </div>
                <div className="info-box-right">
                  <div className="info-line"><strong>Total Passengers:</strong> {ride.numberOfSeats || ride.passengers?.length || 1}</div>
                  <div className="info-line"><strong>Class:</strong> General</div>
                  <div className="info-line"><strong>Status:</strong> <span className="status-conf">CONFIRMED</span></div>
                </div>
              </div>

              <div className="journey-summary-bar">
                <div className="j-point">
                  <span className="j-label">From:</span>
                  <span className="j-city">{ride.boardingPoint}</span>
                </div>
                <div className="j-arrow">➔</div>
                <div className="j-point">
                  <span className="j-label">To:</span>
                  <span className="j-city">{ride.droppingPoint}</span>
                </div>
              </div>

              <div className="ticket-table-section">
                <div className="table-header-title">PASSENGER DETAILS</div>
                <table className="passenger-table-official">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Passenger Name</th>
                      <th>Age</th>
                      <th>Gender</th>
                      <th>Seat No</th>
                      <th>Booking Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ride.passengers && ride.passengers.length > 0 ? (
                      ride.passengers.map((p, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td className="p-name-main">{p.name || '---'}</td>
                          <td>{p.age || '--'}</td>
                          <td style={{ textTransform: 'uppercase' }}>
                            {p.gender?.toString().toLowerCase().trim() === 'male' ? 'M' : 
                             p.gender?.toString().toLowerCase().trim() === 'female' ? 'F' : 
                             p.gender?.toString().toLowerCase().trim() === 'other' ? 'O' : (p.gender || '---')}
                          </td>
                          <td>{12 + idx}</td>
                          <td className="status-cell">CNF / B1 / {12 + idx}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td>1</td>
                        <td className="p-name-main">{user?.name || 'PASSENGER'}</td>
                        <td>{user?.age || '--'}</td>
                        <td style={{ textTransform: 'uppercase' }}>
                          {user?.gender?.toString().toLowerCase().trim() === 'male' ? 'M' : 
                           user?.gender?.toString().toLowerCase().trim() === 'female' ? 'F' : 
                           user?.gender?.toString().toLowerCase().trim() === 'other' ? 'O' : (user?.gender || '---')}
                        </td>
                        <td>12</td>
                        <td className="status-cell">CNF / B1 / 12</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="ticket-table-section">
                <div className="table-header-title">FARE DETAILS</div>
                <div className="fare-official-box">
                  <div className="fare-main-line">
                    <span>Total Ticket Fare (all inclusive):</span>
                    <span className="fare-price">₹{ride.fare || 0}.00</span>
                  </div>
                  <div className="fare-words">Total Amount (in words): <strong>Rupees {ride.fare || 0} only.</strong></div>
                </div>
              </div>

              <div className="ticket-table-section">
                <div className="table-header-title">IMPORTANT NOTES</div>
                <div className="notes-content">
                  <p>1. Please carry a valid Photo ID Proof (Aadhaar, Voter ID, PAN, Driving License, Passport).</p>
                  <p>2. E-ticket is valid only when accompanied by original ID proof of the passenger.</p>
                  <p>3. Do not carry any inflammable/explosive/prohibited materials in the bus.</p>
                  <p>4. Boarding point might be subject to change due to local traffic; check app for live updates.</p>
                </div>
              </div>

              <div className="ticket-page-1-footer">
                <div className="footer-left">
                  <div className="qr-box-official">
                    <QRCode
                      value={qrTicketUrl}
                      size={72}
                      level="L"
                      style={{ height: "auto", maxWidth: "100%", width: "100%", display: "block" }}
                    />
                  </div>
                  <div className="qr-txt">Verified Ticket</div>
                </div>
                <div className="footer-right">
                  <p>Digitally signed by SmartBus Authority</p>
                  <p>Generated on: {formatDate(new Date())}</p>
                </div>
              </div>

              <div className="pride-watermark">INDIAN BUS SERVICES - SMARTBUS</div>
            </div>

            <div className="page-divider no-print"></div>

            {/* PAGE 2: TERMS AND CONDITIONS */}
            <div className="ticket-page page-2">
              <div className="tc-header">
                <h3>Terms and Conditions / Instructions for Passengers</h3>
              </div>
              <div className="tc-content">
                <div className="tc-section">
                  <h4>1. General Instructions</h4>
                  <p>ERS/VRM/SMS/Email sent by SmartBus is valid only when accompanied with one of the prescribed proofs of Identity in original. Original Identity proofs: Voter Identity Card / Passport / PAN Card / Driving License / Photo ID card issued by Central / State Govt. / Aadhaar Card.</p>
                  <p>The passenger shall present the e-ticket for verification on demand by the conductor/authorized staff during the journey.</p>
                </div>

                <div className="tc-section">
                  <h4>2. Cancellation and Refund Policy</h4>
                  <p>Cancellation can be done online up to 2 hours before the scheduled departure of the bus. Refund will be credited back to the source account within 5-7 working days. Cancellation charges of 20% apply if cancelled within 24 hours of journey.</p>
                </div>

                <div className="tc-section">
                  <h4>3. Luggage and Safety</h4>
                  <p>Each passenger is allowed up to 15kg of personal luggage. Dangerous goods, inflammables, and illegal substances are strictly prohibited. SmartBus is not responsible for any loss or damage to personal items.</p>
                </div>

                <div className="tc-section">
                  <h4>4. Journey and Punctuality</h4>
                  <p>Passengers are advised to reach the boarding point at least 15 minutes before departure. The boarding points are subject to change due to traffic conditions; please check live tracking on the app.</p>
                </div>

                <div className="tc-section">
                  <h4>5. COVID-19 / Health Guidelines</h4>
                  <p>Passengers must follow all prevailing health guidelines including wearing masks and maintaining hygiene. Do not travel if you are experiencing symptoms or have tested positive recently.</p>
                </div>

                <div className="tc-section">
                  <h4>6. Contact Information</h4>
                  <p>For any complaints or feedback, please write to help@smartbus.in or call our 24/7 hotline at +91-11-23344555.</p>
                </div>

                <div className="india-footer-mark">
                  <div className="swachh-bharat-official">
                    <img src={swachhLogo} alt="Swachh Bharat" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Ticket;
