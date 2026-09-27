package com.axelero.orderflow.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class OrderMessage {

    @JsonProperty("schemaVersion")
    private int schemaVersion;

    @JsonProperty("type")
    private String type;

    @JsonProperty("clientOrderId")
    private String clientOrderId;

    @JsonProperty("instrumentId")
    private String instrumentId;

    @JsonProperty("side")
    private String side;

    @JsonProperty("orderType")
    private String orderType;

    @JsonProperty("quantity")
    private Long quantity;

    @JsonProperty("limitPrice")
    private Long limitPrice;

    @JsonProperty("timeInForce")
    private String timeInForce;

    @JsonProperty("clientTimestamp")
    private String clientTimestamp;

    public int getSchemaVersion() { return schemaVersion; }
    public void setSchemaVersion(int schemaVersion) { this.schemaVersion = schemaVersion; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getClientOrderId() { return clientOrderId; }
    public void setClientOrderId(String clientOrderId) { this.clientOrderId = clientOrderId; }

    public String getInstrumentId() { return instrumentId; }
    public void setInstrumentId(String instrumentId) { this.instrumentId = instrumentId; }

    public String getSide() { return side; }
    public void setSide(String side) { this.side = side; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public Long getQuantity() { return quantity; }
    public void setQuantity(Long quantity) { this.quantity = quantity; }

    public Long getLimitPrice() { return limitPrice; }
    public void setLimitPrice(Long limitPrice) { this.limitPrice = limitPrice; }

    public String getTimeInForce() { return timeInForce; }
    public void setTimeInForce(String timeInForce) { this.timeInForce = timeInForce; }

    public String getClientTimestamp() { return clientTimestamp; }
    public void setClientTimestamp(String clientTimestamp) { this.clientTimestamp = clientTimestamp; }

    public void validate() {
        if (schemaVersion <= 0) {
            throw new IllegalArgumentException("schemaVersion must be > 0");
        }
        if (type == null || type.isBlank()) {
            throw new IllegalArgumentException("type is required");
        }
        if (clientOrderId == null || clientOrderId.isBlank()) {
            throw new IllegalArgumentException("clientOrderId is required");
        }
        if (instrumentId == null || instrumentId.isBlank()) {
            throw new IllegalArgumentException("instrumentId is required");
        }
        if (!"BUY".equalsIgnoreCase(side) && !"SELL".equalsIgnoreCase(side)) {
            throw new IllegalArgumentException("side must be BUY or SELL");
        }
        if (!"LIMIT".equalsIgnoreCase(orderType) && !"MARKET".equalsIgnoreCase(orderType)) {
            throw new IllegalArgumentException("orderType must be LIMIT or MARKET");
        }
        if (quantity == null || quantity <= 0) {
            throw new IllegalArgumentException("quantity must be > 0");
        }
        if ("LIMIT".equalsIgnoreCase(orderType) && (limitPrice == null || limitPrice <= 0)) {
            throw new IllegalArgumentException("limitPrice is required for LIMIT orders");
        }
        if ("MARKET".equalsIgnoreCase(orderType) && limitPrice != null) {
            throw new IllegalArgumentException("limitPrice must be null for MARKET orders");
        }
        if (timeInForce == null || timeInForce.isBlank()) {
            throw new IllegalArgumentException("timeInForce is required");
        }
        if (clientTimestamp == null || clientTimestamp.isBlank()) {
            throw new IllegalArgumentException("clientTimestamp is required");
        }
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof OrderMessage that)) return false;
        return schemaVersion == that.schemaVersion
                && Objects.equals(type, that.type)
                && Objects.equals(clientOrderId, that.clientOrderId)
                && Objects.equals(instrumentId, that.instrumentId)
                && Objects.equals(side, that.side)
                && Objects.equals(orderType, that.orderType)
                && Objects.equals(quantity, that.quantity)
                && Objects.equals(limitPrice, that.limitPrice)
                && Objects.equals(timeInForce, that.timeInForce)
                && Objects.equals(clientTimestamp, that.clientTimestamp);
    }

    @Override
    public int hashCode() {
        return Objects.hash(schemaVersion, type, clientOrderId, instrumentId, side, orderType, quantity, limitPrice, timeInForce, clientTimestamp);
    }
}
