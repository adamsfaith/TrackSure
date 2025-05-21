;; Supply Chain Tracking System
;; A smart contract to track products from origin to consumer with immutable records
;; Written in Clarity for the Stacks blockchain

;; Define Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-found (err u101))
(define-constant err-already-exists (err u102))
(define-constant err-unauthorized (err u103))

;; Define helper functions to get current time
(define-read-only (get-current-time)
  ;; For Clarinet versions without access to block-info,
  ;; we'll use u0 as a substitute timestamp for testing
  ;; In production this would be replaced with (get-block-info? time u0)
  u0
)

;; Define Data Structures

;; Product structure
(define-map products
  { product-id: (string-ascii 36) }
  {
    name: (string-ascii 64),
    description: (string-ascii 256),
    origin: (string-ascii 64),
    creation-time: uint,
    current-owner: principal,
    is-active: bool
  }
)

;; Entity structure (manufacturers, distributors, retailers, etc.)
(define-map entities
  { entity-id: principal }
  {
    name: (string-ascii 64),
    role: (string-ascii 16),
    is-verified: bool
  }
)

;; Transfer history structure
(define-map transfer-history
  { 
    product-id: (string-ascii 36), 
    transfer-id: uint 
  }
  {
    from: principal,
    to: principal,
    timestamp: uint,
    location: (string-ascii 64),
    notes: (string-ascii 256)
  }
)

;; Counter for transfer-ids
(define-data-var transfer-id-counter uint u0)

;; Read-only functions

;; Get product details
(define-read-only (get-product (product-id (string-ascii 36)))
  (map-get? products { product-id: product-id })
)

;; Get entity details
(define-read-only (get-entity (entity-id principal))
  (map-get? entities { entity-id: entity-id })
)

;; Get transfer record
(define-read-only (get-transfer-record (product-id (string-ascii 36)) (transfer-id uint))
  (map-get? transfer-history { product-id: product-id, transfer-id: transfer-id })
)

;; Helper function to check if entity is verified
(define-read-only (is-entity-verified (entity-id principal))
  (default-to false (get is-verified (map-get? entities { entity-id: entity-id })))
)

;; Public functions

;; Register a new entity (manufacturer, distributor, retailer)
(define-public (register-entity (name (string-ascii 64)) (role (string-ascii 16)))
  (let ((entity-id tx-sender))
    (match (map-get? entities { entity-id: entity-id })
      entity err-already-exists
      (begin
        (map-set entities
          { entity-id: entity-id }
          {
            name: name,
            role: role,
            is-verified: false
          }
        )
        (ok true)
      )
    )
  )
)

;; Verify an entity (only contract owner can do this)
(define-public (verify-entity (entity-id principal))
  (if (is-eq tx-sender contract-owner)
    (match (map-get? entities { entity-id: entity-id })
      entity (begin
        (map-set entities
          { entity-id: entity-id }
          (merge entity { is-verified: true })
        )
        (ok true)
      )
      err-not-found
    )
    err-owner-only
  )
)

;; Register a new product (only verified entities can do this)
(define-public (register-product 
                (product-id (string-ascii 36)) 
                (name (string-ascii 64)) 
                (description (string-ascii 256))
                (origin (string-ascii 64)))
  (let ((manufacturer tx-sender))
    (if (is-entity-verified manufacturer)
      (match (map-get? products { product-id: product-id })
        product err-already-exists
        (begin
          (map-set products
            { product-id: product-id }
            {
              name: name,
              description: description,
              origin: origin,
              creation-time: (get-current-time),
              current-owner: manufacturer,
              is-active: true
            }
          )
          ;; Create the initial transfer record (origin to manufacturer)
          (record-transfer product-id contract-owner manufacturer origin "Product created")
        )
      )
      err-unauthorized
    )
  )
)

;; Record a transfer of a product
(define-public (transfer-product 
                (product-id (string-ascii 36)) 
                (new-owner principal)
                (location (string-ascii 64))
                (notes (string-ascii 256)))
  (let ((current-owner tx-sender))
    (match (map-get? products { product-id: product-id })
      product
        (if (and 
              (is-eq (get current-owner product) current-owner)
              (get is-active product)
              (is-entity-verified current-owner)
              (is-entity-verified new-owner))
          (begin
            ;; Update product owner
            (map-set products
              { product-id: product-id }
              (merge product { current-owner: new-owner })
            )
            ;; Record the transfer
            (record-transfer product-id current-owner new-owner location notes)
          )
          err-unauthorized
        )
      err-not-found
    )
  )
)

;; Helper function to record a transfer
(define-private (record-transfer 
                  (product-id (string-ascii 36)) 
                  (from principal) 
                  (to principal)
                  (location (string-ascii 64))
                  (notes (string-ascii 256)))
  (let ((new-transfer-id (var-get transfer-id-counter)))
    ;; Increment transfer ID counter
    (var-set transfer-id-counter (+ new-transfer-id u1))
    
    ;; Record the transfer
    (map-set transfer-history
      { product-id: product-id, transfer-id: new-transfer-id }
      {
        from: from,
        to: to,
        timestamp: (get-current-time),
        location: location,
        notes: notes
      }
    )
    (ok new-transfer-id)
  )
)

;; Mark a product as inactive (end of life, consumed, etc.)
(define-public (deactivate-product (product-id (string-ascii 36)))
  (let ((current-owner tx-sender))
    (match (map-get? products { product-id: product-id })
      product
        (if (is-eq (get current-owner product) current-owner)
          (begin
            (map-set products
              { product-id: product-id }
              (merge product { is-active: false })
            )
            (ok true)
          )
          err-unauthorized
        )
      err-not-found
    )
  )
)

;; Add certification or quality check record
(define-public (add-certification 
                (product-id (string-ascii 36))
                (certification-details (string-ascii 256))
                (location (string-ascii 64)))
  (let ((certifier tx-sender))
    (if (is-entity-verified certifier)
      (match (map-get? products { product-id: product-id })
        product 
          (record-transfer product-id certifier (get current-owner product) location certification-details)
        err-not-found
      )
      err-unauthorized
    )
  )
)