package com.axelero.orderflow.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ExecutionEvent {
    @JsonProperty("eventType")
    private String eventType;

    @JsonProperty("instrumentId")
    private String instrumentId;

    @JsonProperty("matchPrice")
    private Long matchPrice;

    @JsonProperty("quantity")
    private Long quantity;

    @JsonProperty("buyOrderId")
    private String buyOrderId;

    @JsonProperty("sellOrderId")
    private String sellOrderId;

    @JsonProperty("eventTime")
    private String eventTime;

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getInstrumentId() { return instrumentId; }
    public void setInstrumentId(String instrumentId) { this.instrumentId = instrumentId; }

    public Long getMatchPrice() { return matchPrice; }
    public void setMatchPrice(Long matchPrice) { this.matchPrice = matchPrice; }

    public Long getQuantity() { return quantity; }
    public void setQuantity(Long quantity) { this.quantity = quantity; }

    public String getBuyOrderId() { return buyOrderId; }
    public void setBuyOrderId(String buyOrderId) { this.buyOrderId = buyOrderId; }

    public String getSellOrderId() { return sellOrderId; }
    public void setSellOrderId(String sellOrderId) { this.sellOrderId = sellOrderId; }

    public String getEventTime() { return eventTime; }
    public void setEventTime(String eventTime) { this.eventTime = eventTime; }

    public static ExecutionEvent of(String eventType, String instrumentId, long matchPrice, long quantity, String buyOrderId, String sellOrderId) {
        ExecutionEvent event = new ExecutionEvent();
        event.setEventType(eventType);
        event.setInstrumentId(instrumentId);
        event.setMatchPrice(matchPrice);
        event.setQuantity(quantity);
        event.setBuyOrderId(buyOrderId);
        event.setSellOrderId(sellOrderId);
        event.setEventTime(Instant.now().toString());
        return event;
    }
}
